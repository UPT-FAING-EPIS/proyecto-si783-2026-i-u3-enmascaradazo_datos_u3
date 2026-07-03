import pytest

from app.application.services.job_orchestrator import JobOrchestrator
from app.domain.entities.masking_rule import MaskingRule
from app.domain.value_objects.graph_element_kind import GraphElementKind
from app.domain.value_objects.masking_algorithm import MaskingAlgorithm
from app.domain.value_objects.masking_run_mode import MaskingRunMode
from app.domain.value_objects.protection_mode import ProtectionMode


class FakeGraphClient:
    def __init__(self):
        self.updated = []
        self.unset = []

    async def get_graph_schema(self):
        return {
            "nodes": {"Cliente": ["dni", "nombre"]},
            "relationships": {"COMPRA": ["codigoOperacion", "monto"]},
        }

    async def fetch_graph_elements(self, element_kind, target, limit=500):
        if element_kind == "node":
            return [{"_id": "n1", "_graph_element": "node", "_labels": [target], "dni": "74382916", "nombre": "Milton"}]
        return [{"_id": "r1", "_graph_element": "relationship", "_type": target, "codigoOperacion": "OP987654", "monto": 100}]

    async def update_graph_element(self, element_kind, target, element_id, updates):
        self.updated.append((element_kind, target, element_id, updates))

    async def unset_graph_property(self, element_kind, target, property_name):
        self.unset.append((element_kind, target, property_name))


def orchestrator():
    return JobOrchestrator(None, None, None)


@pytest.mark.asyncio
async def test_graph_masked_column_creates_property_on_node():
    client = FakeGraphClient()
    rule = MaskingRule(
        name="mask dni",
        connection_id="c1",
        target_table="Cliente",
        target_column="dni",
        graph_element=GraphElementKind.NODE,
        strategy=MaskingAlgorithm.REDACTION,
        strategy_options={"keep_left": 2, "keep_right": 2, "mask_length": 4},
        protection_mode=ProtectionMode.MASKED_COLUMN,
        output_column="dni_masked",
    )

    result = await orchestrator()._process_graph(client, [rule], "job123", MaskingRunMode.APPLY)

    assert result["affected_tables"] == ["node:Cliente"]
    assert result["generated_artifacts"][0]["type"] == "graph_property"
    assert client.updated[0] == ("node", "Cliente", "n1", {"dni_masked": "74****16"})


@pytest.mark.asyncio
async def test_graph_relationship_query_masks_sensitive_property():
    client = FakeGraphClient()
    rule = MaskingRule(
        name="mask relationship code",
        connection_id="c1",
        target_table="COMPRA",
        target_column="codigoOperacion",
        graph_element=GraphElementKind.RELATIONSHIP,
        strategy=MaskingAlgorithm.REDACTION,
        strategy_options={"keep_left": 2, "keep_right": 2, "mask_length": 3},
        protection_mode=ProtectionMode.VIRTUAL_VIEW,
    )

    records = await orchestrator()._query_graph(client, [rule], should_mask=True)

    assert records[0]["_graph_scope"] == "relationship:COMPRA"
    assert records[0]["codigoOperacion"] == "OP***54"
