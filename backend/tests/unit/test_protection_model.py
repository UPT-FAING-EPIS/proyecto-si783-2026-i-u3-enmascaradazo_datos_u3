from app.application.schemas import RuleCreate
from app.domain.value_objects.masking_algorithm import MaskingAlgorithm
from app.domain.value_objects.protection_mode import ProtectionMode
from app.core.crypto import decrypt_value, encrypt_value


def test_rule_defaults_to_non_destructive_masked_view():
    rule = RuleCreate(
        name="mask dni",
        connection_id="conn1",
        target_table="clientes",
        target_column="dni",
        strategy=MaskingAlgorithm.REDACTION,
    )
    assert rule.protection_mode == ProtectionMode.MASKED_VIEW


def test_symmetric_encryption_roundtrip():
    encrypted = encrypt_value("74382916")
    assert encrypted != "74382916"
    assert decrypt_value(encrypted) == "74382916"
