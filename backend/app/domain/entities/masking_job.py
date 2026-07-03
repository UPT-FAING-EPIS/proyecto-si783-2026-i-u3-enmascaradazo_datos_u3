from enum import Enum
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.domain.value_objects.masking_run_mode import MaskingRunMode


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    UNMASKED = "unmasked"


class MaskingJob(BaseModel):
    id: Optional[str] = None
    connection_id: str
    rule_ids: List[str]
    run_mode: MaskingRunMode = MaskingRunMode.DRY_RUN
    status: JobStatus = JobStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    records_processed: int = 0
    records_previewed: int = 0
    affected_tables: List[str] = Field(default_factory=list)
    preview_sample: List[Dict[str, Any]] = Field(default_factory=list)
    generated_artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    owner_id: Optional[str] = None
    shared_with: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
