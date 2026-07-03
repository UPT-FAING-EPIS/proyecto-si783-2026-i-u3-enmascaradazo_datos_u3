from app.domain.entities.connection import ConnectionConfig
from app.domain.value_objects.database_type import DatabaseType
from app.infrastructure.db.connection_uri import parse_connection_uri
from app.infrastructure.db.factory import normalize_connection_config
from app.infrastructure.db.mongodb_client import build_mongo_uri


def test_supabase_postgres_uri_is_normalized_without_leaking_secret_in_host():
    conn = ConnectionConfig(
        name="Supabase",
        type=DatabaseType.POSTGRES,
        host="postgresql://postgres:Pass@123@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=require",
        port=0,
        database="",
        username="",
        password="",
    )
    normalized = normalize_connection_config(conn)

    assert normalized.host == "db.abcdefghijklmnopqrst.supabase.co"
    assert normalized.port == 5432
    assert normalized.database == "postgres"
    assert normalized.username == "postgres"
    assert normalized.password == "Pass@123"
    assert "@" not in normalized.host
    assert normalized.additional_options["uri_query"]["sslmode"] == "require"


def test_mongodb_uri_with_special_password_is_encoded_once():
    parsed = parse_connection_uri(
        "mongodb+srv://user:Clave@123@cluster0.abcde.mongodb.net/enmask_db?retryWrites=true",
        DatabaseType.MONGODB,
    )
    assert parsed.host == "cluster0.abcde.mongodb.net"
    assert parsed.username == "user"
    assert parsed.password == "Clave@123"
    assert parsed.database == "enmask_db"

    uri = build_mongo_uri(
        parsed.host,
        parsed.username,
        parsed.password,
        parsed.port,
        scheme=parsed.scheme,
        query=parsed.query,
    )
    assert uri.startswith("mongodb+srv://user:Clave%40123@cluster0.abcde.mongodb.net")
    assert "retryWrites=true" in uri


def test_redis_uri_sets_database_index_from_path():
    conn = ConnectionConfig(
        name="Redis URI",
        type=DatabaseType.REDIS,
        host="redis://:secret@localhost:6379/2",
        port=0,
        database="",
        username="",
        password="",
    )
    normalized = normalize_connection_config(conn)
    assert normalized.host == "localhost"
    assert normalized.port == 6379
    assert normalized.database == "2"
    assert normalized.password == "secret"


def test_neo4j_uri_keeps_secure_scheme_as_option():
    conn = ConnectionConfig(
        name="Neo4j Aura",
        type=DatabaseType.NEO4J,
        host="neo4j+s://neo4j:secret@abc.databases.neo4j.io:7687/neo4j",
        port=0,
        database="",
        username="",
        password="",
    )
    normalized = normalize_connection_config(conn)
    assert normalized.host == "abc.databases.neo4j.io"
    assert normalized.database == "neo4j"
    assert normalized.additional_options["source_uri_scheme"] == "neo4j+s"
