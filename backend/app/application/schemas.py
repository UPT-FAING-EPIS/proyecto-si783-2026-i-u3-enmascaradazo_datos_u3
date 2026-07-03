from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.domain.entities.masking_job import JobStatus
from app.domain.value_objects.database_type import DatabaseType
from app.domain.value_objects.masking_algorithm import MaskingAlgorithm
from app.domain.value_objects.masking_run_mode import MaskingRunMode
from app.domain.value_objects.protection_mode import ProtectionMode
from app.domain.value_objects.graph_element_kind import GraphElementKind


class ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: DatabaseType
    host: str = Field(default="localhost", max_length=2048)
    port: int = Field(default=0, ge=0, le=65535)
    database: str = Field(default="", max_length=255)
    username: str = Field(default="", max_length=255)
    password: str = Field(default="", max_length=2048)
    additional_options: Optional[Dict[str, Any]] = None


class ConnectionResponse(BaseModel):
    id: str
    name: str
    type: DatabaseType
    host: str
    port: int
    database: str
    username: str
    additional_options: Optional[Dict[str, Any]] = None




class SupportedDatabaseInfo(BaseModel):
    type: DatabaseType
    label: str
    category: str
    default_port: int
    database_label: str
    requires_host: bool = True
    supports_native_view: bool = True
    supports_masked_column: bool = True
    notes: str = ""


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    type: DatabaseType
    host: str
    port: int
    database: str


class RuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    connection_id: str
    target_table: str = Field(min_length=1, max_length=255)
    target_column: str = Field(min_length=1, max_length=255)
    strategy: MaskingAlgorithm
    strategy_options: Optional[Dict[str, Any]] = None
    protection_mode: ProtectionMode = ProtectionMode.MASKED_VIEW
    output_column: Optional[str] = Field(default=None, max_length=255)
    view_name: Optional[str] = Field(default=None, max_length=255)
    key_alias: Optional[str] = Field(default=None, max_length=120)
    graph_element: Optional[GraphElementKind] = None


class RuleResponse(RuleCreate):
    id: str


class JobCreate(BaseModel):
    connection_id: str
    rule_ids: List[str]
    run_mode: MaskingRunMode = MaskingRunMode.DRY_RUN


class JobResponse(BaseModel):
    id: str
    connection_id: str
    rule_ids: List[str]
    run_mode: MaskingRunMode = MaskingRunMode.DRY_RUN
    status: JobStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    records_processed: int
    records_previewed: int = 0
    affected_tables: List[str] = Field(default_factory=list)
    preview_sample: List[Dict[str, Any]] = Field(default_factory=list)
    generated_artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    owner_id: Optional[str] = None
    shared_with: List[str] = Field(default_factory=list)


class JobShareRequest(BaseModel):
    email: EmailStr


class AuditLogEntry(BaseModel):
    id: str
    job_id: str
    user_id: str
    user_email: str
    user_role: Optional[str] = None
    action: str
    is_masked: bool
    timestamp: datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("El nombre es obligatorio.")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("La contraseña debe tener mínimo 8 caracteres.")
        if not any(ch.isalpha() for ch in value):
            raise ValueError("La contraseña debe incluir al menos una letra.")
        if not any(ch.isdigit() for ch in value):
            raise ValueError("La contraseña debe incluir al menos un número.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "user"


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse




class SchemaTarget(BaseModel):
    name: str
    label: str
    columns: List[str] = Field(default_factory=list)
    kind: str = "table"
    row_count_available: bool = False


class ConnectionSchemaResponse(BaseModel):
    connection_id: str
    engine: DatabaseType
    targets: List[SchemaTarget] = Field(default_factory=list)
    graph_nodes: Dict[str, List[str]] = Field(default_factory=dict)
    graph_relationships: Dict[str, List[str]] = Field(default_factory=dict)


class TablePreviewResponse(BaseModel):
    connection_id: str
    engine: DatabaseType
    target: str
    graph_element: Optional[GraphElementKind] = None
    columns: List[str] = Field(default_factory=list)
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    total_returned: int = 0


class WorkbenchFieldMaskRequest(BaseModel):
    target_column: str = Field(min_length=1, max_length=255)
    strategy: MaskingAlgorithm = MaskingAlgorithm.REDACTION
    strategy_options: Optional[Dict[str, Any]] = None
    protection_mode: ProtectionMode = ProtectionMode.VIRTUAL_VIEW


class WorkbenchMaskPreviewRequest(BaseModel):
    connection_id: str
    target_table: str = Field(min_length=1, max_length=255)
    # Compatibilidad con versiones anteriores: un algoritmo para varias columnas.
    target_columns: List[str] = Field(default_factory=list)
    strategy: MaskingAlgorithm = MaskingAlgorithm.REDACTION
    strategy_options: Optional[Dict[str, Any]] = None
    # Nuevo flujo senior: cada campo puede tener su propio algoritmo y modo.
    field_rules: List[WorkbenchFieldMaskRequest] = Field(default_factory=list)
    graph_element: Optional[GraphElementKind] = None
    limit: int = Field(default=20, ge=1, le=100)

    @field_validator("field_rules")
    @classmethod
    def validate_field_rules(cls, value: List[WorkbenchFieldMaskRequest]) -> List[WorkbenchFieldMaskRequest]:
        seen = set()
        for rule in value:
            key = rule.target_column.lower()
            if key in seen:
                raise ValueError(f"Campo duplicado en la vista previa: {rule.target_column}")
            seen.add(key)
        return value


class WorkbenchMaskPreviewResponse(BaseModel):
    connection_id: str
    engine: DatabaseType
    target: str
    graph_element: Optional[GraphElementKind] = None
    original_rows: List[Dict[str, Any]] = Field(default_factory=list)
    masked_rows: List[Dict[str, Any]] = Field(default_factory=list)
    protected_columns: List[str] = Field(default_factory=list)
    total_previewed: int = 0
    mode_hint: str = "Vista previa virtual: no modifica la base de datos."


class DynamicQueryResponse(BaseModel):
    data: List[Dict[str, Any]]
    total_records: int
    is_masked: bool


class MaskingPreviewResponse(BaseModel):
    job_id: str
    run_mode: MaskingRunMode
    records_previewed: int
    preview_sample: List[Dict[str, Any]]
