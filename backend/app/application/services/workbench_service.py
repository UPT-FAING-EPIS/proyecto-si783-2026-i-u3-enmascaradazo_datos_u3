from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.application.schemas import (
    ConnectionSchemaResponse,
    SchemaTarget,
    TablePreviewResponse,
    WorkbenchMaskPreviewRequest,
    WorkbenchMaskPreviewResponse,
)
from app.core.exceptions import ResourceNotFoundError
from app.core.crypto import encrypt_value
from app.domain.entities.connection import ConnectionConfig
from app.domain.interfaces.repository import ConnectionRepository
from app.domain.value_objects.graph_element_kind import GraphElementKind
from app.domain.value_objects.masking_algorithm import MaskingAlgorithm
from app.domain.value_objects.protection_mode import ProtectionMode
from app.infrastructure.db.factory import create_database_client, is_document_database, is_graph_database, is_sql_database
from app.infrastructure.masking.strategies import (
    FPEStrategy,
    HashingStrategy,
    NullificationStrategy,
    PerturbationStrategy,
    RedactionStrategy,
    SubstitutionStrategy,
)


class WorkbenchService:
    """Explorador seguro para vista previa de enmascaramiento.

    Este servicio no crea reglas, no crea jobs y no modifica datos. Su objetivo es
    que el usuario pueda seleccionar una conexion, revisar estructura, ver datos
    de muestra y comparar original vs enmascarado antes de decidir si crea una regla.
    """

    def __init__(self, connection_repository: ConnectionRepository):
        self._connection_repository = connection_repository
        self._strategies = {
            MaskingAlgorithm.SUBSTITUTION: SubstitutionStrategy(),
            MaskingAlgorithm.HASHING: HashingStrategy(),
            MaskingAlgorithm.REDACTION: RedactionStrategy(),
            MaskingAlgorithm.NULLIFICATION: NullificationStrategy(),
            MaskingAlgorithm.FPE: FPEStrategy(),
            MaskingAlgorithm.PERTURBATION: PerturbationStrategy(),
        }

    async def _owned_connection(self, connection_id: str, owner_id: str) -> ConnectionConfig:
        connection = await self._connection_repository.get_by_id(connection_id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", connection_id)
        return connection

    async def get_schema(self, connection_id: str, owner_id: str) -> ConnectionSchemaResponse:
        connection = await self._owned_connection(connection_id, owner_id)
        client = create_database_client(connection)

        if is_graph_database(connection):
            graph_schema = await client.get_graph_schema()
            targets: List[SchemaTarget] = []
            for label, props in sorted(graph_schema.get("nodes", {}).items()):
                targets.append(SchemaTarget(name=label, label=f"Nodo · {label}", columns=props, kind="node"))
            for rel_type, props in sorted(graph_schema.get("relationships", {}).items()):
                targets.append(SchemaTarget(name=rel_type, label=f"Relacion · {rel_type}", columns=props, kind="relationship"))
            return ConnectionSchemaResponse(
                connection_id=connection_id,
                engine=connection.type,
                targets=targets,
                graph_nodes=graph_schema.get("nodes", {}),
                graph_relationships=graph_schema.get("relationships", {}),
            )

        schema = await client.get_schema()
        targets = []
        for target_name, columns in sorted(schema.items()):
            kind = "collection" if is_document_database(connection) else "table"
            if connection.type.value == "redis":
                kind = "key"
            targets.append(SchemaTarget(name=target_name, label=target_name, columns=list(columns or []), kind=kind))
        return ConnectionSchemaResponse(connection_id=connection_id, engine=connection.type, targets=targets)

    async def get_records(
        self,
        connection_id: str,
        owner_id: str,
        target: str,
        limit: int = 20,
        graph_element: Optional[GraphElementKind] = None,
    ) -> TablePreviewResponse:
        connection = await self._owned_connection(connection_id, owner_id)
        client = create_database_client(connection)
        safe_limit = max(1, min(int(limit or 20), 100))

        if is_graph_database(connection):
            kind = graph_element or GraphElementKind.NODE
            rows = await client.fetch_graph_elements(kind.value, target, limit=safe_limit)
            rows = [self._json_safe(row) for row in rows]
            return TablePreviewResponse(
                connection_id=connection_id,
                engine=connection.type,
                target=target,
                graph_element=kind,
                columns=self._columns_from_rows(rows),
                rows=rows,
                total_returned=len(rows),
            )

        schema_columns: List[str] = []
        if is_sql_database(connection):
            rows = await client.select_all(target, limit=safe_limit)
            try:
                schema = await client.get_schema()
                schema_columns = list(schema.get(target) or schema.get(target.split(".")[-1]) or [])
                if not schema_columns and "." not in target:
                    matches = [cols for name, cols in schema.items() if name.split(".")[-1].lower() == target.lower()]
                    if len(matches) == 1:
                        schema_columns = list(matches[0])
            except Exception:
                schema_columns = []
        elif is_document_database(connection):
            rows = (await client.fetch_all(target))[:safe_limit]
        else:
            raise ValueError(f"Motor no soportado para workbench: {connection.type}")

        rows = [self._json_safe(row) for row in rows]
        detected_columns = self._columns_from_rows(rows)
        return TablePreviewResponse(
            connection_id=connection_id,
            engine=connection.type,
            target=target,
            columns=detected_columns or schema_columns,
            rows=rows,
            total_returned=len(rows),
        )

    async def preview_mask(
        self,
        request: WorkbenchMaskPreviewRequest,
        owner_id: str,
    ) -> WorkbenchMaskPreviewResponse:
        connection = await self._owned_connection(request.connection_id, owner_id)
        preview = await self.get_records(
            connection_id=request.connection_id,
            owner_id=owner_id,
            target=request.target_table,
            limit=request.limit,
            graph_element=request.graph_element,
        )

        original_rows = preview.rows
        field_rules = list(request.field_rules or [])
        if not field_rules:
            # Modo legacy: aplica la misma estrategia a todas las columnas recibidas.
            field_rules = [
                type("LegacyWorkbenchFieldRule", (), {
                    "target_column": column,
                    "strategy": request.strategy,
                    "strategy_options": request.strategy_options or {},
                    "protection_mode": None,
                })()
                for column in request.target_columns
                if column
            ]

        target_columns = [rule.target_column for rule in field_rules if rule.target_column]
        if not target_columns:
            raise ValueError("Selecciona al menos una columna, campo o propiedad para proteger.")

        available_columns = set(preview.columns or [])
        if original_rows:
            available_columns.update(original_rows[0].keys())
        missing = [column for column in target_columns if available_columns and column not in available_columns]
        if missing:
            raise ValueError(f"Columnas/propiedades no encontradas en la muestra: {', '.join(missing)}")

        masked_rows: List[Dict[str, Any]] = []
        protected_columns: List[str] = []
        has_physical_mode = False
        has_derived_mode = False
        has_view_mode = False
        has_encryption_mode = False

        for row in original_rows:
            masked = dict(row)
            for field_rule in field_rules:
                column = field_rule.target_column
                if column not in row:
                    continue

                strategy = self._strategies[field_rule.strategy]
                options = field_rule.strategy_options or {}
                mode = field_rule.protection_mode or ProtectionMode.VIRTUAL_VIEW

                if mode == ProtectionMode.MASKED_COLUMN:
                    # La vista previa representa lo que pasaria en la BD real:
                    # se conserva el campo original y se agrega *_masked.
                    output_column = f"{column}_masked"
                    masked[output_column] = strategy.mask(row[column], **options)
                    protected_columns.append(output_column)
                    has_derived_mode = True
                elif mode == ProtectionMode.SYMMETRIC_ENCRYPTION:
                    # Simula el valor cifrado que quedaria al aplicar en la BD real.
                    masked[column] = encrypt_value(row[column])
                    protected_columns.append(column)
                    has_physical_mode = True
                    has_encryption_mode = True
                elif mode == ProtectionMode.STATIC_MASK:
                    masked[column] = strategy.mask(row[column], **options)
                    protected_columns.append(column)
                    has_physical_mode = True
                else:
                    # Vista virtual / vista enmascarada: la consulta protegida muestra
                    # la columna transformada, pero la tabla original no se destruye.
                    masked[column] = strategy.mask(row[column], **options)
                    protected_columns.append(column)
                    has_view_mode = True
            masked_rows.append(self._json_safe(masked))

        # Mantiene orden y evita duplicados en columnas resaltadas.
        protected_columns = list(dict.fromkeys(protected_columns or target_columns))

        if has_physical_mode:
            if has_encryption_mode:
                hint = "Vista previa de encriptación: al ejecutar Apply, el valor real de la columna se cifra en la BD. Usa Restaurar/Desencriptar en Historial."
            else:
                hint = "Vista previa de máscara física: al ejecutar Apply, el valor real de la columna se reemplaza en la BD. Enmask guarda respaldo para restaurar."
        elif has_derived_mode:
            hint = "Vista previa de campo derivado: al ejecutar Apply, Enmask crea/actualiza una columna o propiedad *_masked sin destruir el dato original."
        elif has_view_mode:
            hint = "Vista previa de vista protegida: al ejecutar Apply, Enmask crea una vista o equivalente sin cambiar los datos originales."
        elif is_graph_database(connection):
            hint = "Vista previa virtual de grafo: no modifica nodos ni relaciones."
        elif is_document_database(connection):
            hint = "Vista previa virtual documental/NoSQL: no modifica colecciones, claves ni documentos."
        else:
            hint = "Vista previa virtual SQL: no crea vista ni columna; solo compara el resultado antes de ejecutar."

        return WorkbenchMaskPreviewResponse(
            connection_id=request.connection_id,
            engine=connection.type,
            target=request.target_table,
            graph_element=request.graph_element,
            original_rows=original_rows,
            masked_rows=masked_rows,
            protected_columns=protected_columns,
            total_previewed=len(masked_rows),
            mode_hint=hint,
        )

    def _columns_from_rows(self, rows: List[Dict[str, Any]]) -> List[str]:
        columns: List[str] = []
        seen = set()
        for row in rows:
            for key in row.keys():
                if key not in seen:
                    seen.add(key)
                    columns.append(key)
        return columns

    def _json_safe(self, record: Dict[str, Any]) -> Dict[str, Any]:
        safe = dict(record)
        for key, value in list(safe.items()):
            if hasattr(value, "isoformat"):
                safe[key] = value.isoformat()
            elif not isinstance(value, (str, int, float, bool, list, dict, type(None))):
                safe[key] = str(value)
        return safe
