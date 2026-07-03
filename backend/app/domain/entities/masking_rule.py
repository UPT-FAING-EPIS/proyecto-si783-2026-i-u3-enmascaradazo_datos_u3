from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any

from app.domain.value_objects.masking_algorithm import MaskingAlgorithm
from app.domain.value_objects.protection_mode import ProtectionMode
from app.domain.value_objects.graph_element_kind import GraphElementKind


class MaskingRule(BaseModel):
    id: Optional[str] = None
    name: str
    connection_id: str
    target_table: str
    target_column: str
    strategy: MaskingAlgorithm
    strategy_options: Optional[Dict[str, Any]] = None
    protection_mode: ProtectionMode = ProtectionMode.MASKED_VIEW
    output_column: Optional[str] = None
    view_name: Optional[str] = None
    key_alias: Optional[str] = None
    graph_element: Optional[GraphElementKind] = None
    owner_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
