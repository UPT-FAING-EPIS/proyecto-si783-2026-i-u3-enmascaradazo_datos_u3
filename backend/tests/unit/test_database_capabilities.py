from app.domain.entities.connection import ConnectionConfig
from app.domain.value_objects.database_type import DatabaseType
from app.infrastructure.db.factory import default_port_for, normalize_connection_config, supported_database_capabilities


def test_all_named_engines_have_default_ports():
    expected_ports = {
        DatabaseType.POSTGRES: 5432,
        DatabaseType.MYSQL: 3306,
        DatabaseType.MARIADB: 3306,
        DatabaseType.SQLITE: 0,
        DatabaseType.SQLSERVER: 1433,
        DatabaseType.ORACLE: 1521,
        DatabaseType.CASSANDRA: 9042,
        DatabaseType.MONGODB: 27017,
        DatabaseType.REDIS: 6379,
        DatabaseType.NEO4J: 7687,
    }
    for db_type, port in expected_ports.items():
        assert default_port_for(db_type) == port


def test_supported_capabilities_include_sql_and_nosql_engines():
    available = {item.type for item in supported_database_capabilities()}
    assert set(DatabaseType) <= available


def test_connection_normalization_sets_default_port():
    conn = ConnectionConfig(
        name="Redis local",
        type=DatabaseType.REDIS,
        host="localhost",
        port=0,
        database="0",
        username="",
        password="",
    )
    normalized = normalize_connection_config(conn)
    assert normalized.port == 6379
