from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List
from urllib.parse import quote_plus

from app.infrastructure.db.connection_uri import (
    encode_credential_once,
    looks_like_connection_uri,
    parse_connection_uri,
    query_to_string,
)

from app.domain.entities.connection import ConnectionConfig
from app.domain.value_objects.database_type import DatabaseType


@dataclass(frozen=True)
class DatabaseCapability:
    type: DatabaseType
    label: str
    category: str
    default_port: int
    database_label: str
    requires_host: bool = True
    supports_native_view: bool = True
    supports_masked_column: bool = True
    notes: str = ""


DATABASE_CAPABILITIES: Dict[DatabaseType, DatabaseCapability] = {
    DatabaseType.POSTGRES: DatabaseCapability(DatabaseType.POSTGRES, "PostgreSQL", "Relacional", 5432, "Base de datos", notes="Acepta host separado o URI completa postgresql://, incluido Supabase con SSL/pooler."),
    DatabaseType.MYSQL: DatabaseCapability(DatabaseType.MYSQL, "MySQL", "Relacional", 3306, "Base de datos", notes="Acepta host separado o URI completa mysql://."),
    DatabaseType.MARIADB: DatabaseCapability(DatabaseType.MARIADB, "MariaDB", "Relacional", 3306, "Base de datos", notes="Acepta host separado o URI completa mysql:// / mariadb://."),
    DatabaseType.SQLITE: DatabaseCapability(DatabaseType.SQLITE, "SQLite", "Relacional local", 0, "Ruta del archivo .db", requires_host=False),
    DatabaseType.SQLSERVER: DatabaseCapability(DatabaseType.SQLSERVER, "SQL Server", "Relacional", 1433, "Base de datos", notes="Acepta host separado o URI mssql://. Usa schema.tabla automaticamente, por ejemplo dbo.Clientes o SalesLT.Customer. Requiere ODBC Driver 18."),
    DatabaseType.ORACLE: DatabaseCapability(DatabaseType.ORACLE, "Oracle Database", "Relacional", 1521, "Service name / SID", notes="Acepta host separado o URI oracle://. Para cloud/wallet usa query config_dir/wallet_location o tns_alias."),
    DatabaseType.CASSANDRA: DatabaseCapability(DatabaseType.CASSANDRA, "Apache Cassandra", "NoSQL wide-column", 9042, "Keyspace", supports_native_view=False, notes="Acepta host separado, multiples hosts separados por coma o URI cassandra://. Para cloud usa local_datacenter, ssl=true o secure_connect_bundle."),
    DatabaseType.MONGODB: DatabaseCapability(DatabaseType.MONGODB, "MongoDB", "NoSQL documental", 27017, "Base de datos", notes="Acepta URI completa de Atlas en Host: mongodb+srv://usuario:clave@cluster... o solo cluster.mongodb.net."),
    DatabaseType.REDIS: DatabaseCapability(DatabaseType.REDIS, "Redis", "NoSQL clave-valor", 6379, "Índice lógico DB", supports_native_view=False, notes="Acepta redis:// y rediss:// para Redis Cloud/TLS. Para reglas usa target_table como patrón de clave; target_column=value o campo hash."),
    DatabaseType.NEO4J: DatabaseCapability(DatabaseType.NEO4J, "Neo4j", "NoSQL grafo", 7687, "Database", supports_native_view=False, notes="Acepta bolt://, neo4j://, bolt+s:// y neo4j+s:// para Neo4j Aura. Reglas: node/relationship, label/tipo y propiedad."),
}

DEFAULT_PORTS = {db_type: capability.default_port for db_type, capability in DATABASE_CAPABILITIES.items()}


def supported_database_capabilities() -> List[DatabaseCapability]:
    return list(DATABASE_CAPABILITIES.values())


def default_port_for(db_type: DatabaseType) -> int:
    return DEFAULT_PORTS.get(db_type, 0)


def normalize_connection_config(connection: ConnectionConfig) -> ConnectionConfig:
    """Completa defaults y acepta host separado o URI completa sin mutar el objeto original.

    Si el usuario pega una URI con credenciales, se extraen usuario/contraseña
    hacia campos internos y se guarda el host limpio para no exponer secretos en
    respuestas del API.
    """
    data = connection.model_dump()
    options = dict(data.get("additional_options") or {})
    host_value = str(data.get("host") or "").strip()

    if looks_like_connection_uri(host_value):
        parsed = parse_connection_uri(host_value, connection.type)
        options["source_uri_scheme"] = parsed.scheme
        options["uri_query"] = parsed.query
        data["host"] = parsed.host or data.get("host")
        if parsed.port is not None:
            data["port"] = parsed.port
        if parsed.database:
            data["database"] = parsed.database
        if parsed.username:
            data["username"] = parsed.username
        if parsed.password:
            data["password"] = parsed.password
        data["additional_options"] = options

    if not data.get("port"):
        data["port"] = default_port_for(connection.type)
    if connection.type == DatabaseType.SQLITE:
        data["host"] = data.get("host") or "local-file"
        data["port"] = 0
    if connection.type == DatabaseType.REDIS and not str(data.get("database", "")).strip():
        data["database"] = "0"
    if connection.type == DatabaseType.NEO4J and not str(data.get("database", "")).strip():
        data["database"] = "neo4j"

    if connection.type != DatabaseType.SQLITE and not str(data.get("host", "")).strip():
        raise ValueError("La conexión requiere host o URI.")
    if connection.type not in {DatabaseType.REDIS} and not str(data.get("database", "")).strip():
        raise ValueError("La conexión requiere base de datos, service name, keyspace o database de grafo.")

    return ConnectionConfig(**data)


def _credential(value: str) -> str:
    return encode_credential_once(value or "")


def _uri_query(connection: ConnectionConfig, *, postgres: bool = False) -> str:
    options = connection.additional_options or {}
    query = options.get("uri_query") or {}
    return query_to_string(query, translate_postgres_sslmode=postgres)


def create_database_client(connection: ConnectionConfig):
    """Devuelve el cliente adecuado para el motor configurado.

    Los imports son diferidos para que un entorno liviano no falle si un driver
    opcional solo se usa con un motor específico.
    """
    connection = normalize_connection_config(connection)

    if connection.type == DatabaseType.POSTGRES:
        from app.infrastructure.db.postgres_client import PostgresClient

        dsn = (
            f"postgresql+asyncpg://{_credential(connection.username)}:{_credential(connection.password)}"
            f"@{connection.host}:{connection.port}/{connection.database}{_uri_query(connection, postgres=True)}"
        )
        return PostgresClient(dsn)

    if connection.type in (DatabaseType.MYSQL, DatabaseType.MARIADB):
        from app.infrastructure.db.mysql_client import MySQLClient

        dsn = (
            f"mysql+aiomysql://{_credential(connection.username)}:{_credential(connection.password)}"
            f"@{connection.host}:{connection.port}/{connection.database}{_uri_query(connection)}"
        )
        return MySQLClient(dsn)

    if connection.type == DatabaseType.SQLSERVER:
        from app.infrastructure.db.sqlserver_client import SQLServerClient, build_sqlserver_dsn

        options = connection.additional_options or {}
        uri_query = options.get("uri_query") or {}
        driver = options.get("driver") or uri_query.get("driver") or "ODBC Driver 18 for SQL Server"
        encrypt = options.get("encrypt") or uri_query.get("Encrypt") or uri_query.get("encrypt") or "yes"
        trust_server_certificate = (
            options.get("trust_server_certificate")
            or uri_query.get("TrustServerCertificate")
            or uri_query.get("trustServerCertificate")
            or uri_query.get("trust_server_certificate")
            or "yes"
        )
        timeout = options.get("timeout") or uri_query.get("timeout") or uri_query.get("Connection Timeout") or 10
        dsn = build_sqlserver_dsn(
            connection.username,
            connection.password,
            connection.host,
            connection.port,
            connection.database,
            driver,
            encrypt=encrypt,
            trust_server_certificate=trust_server_certificate,
            timeout=timeout,
        )
        return SQLServerClient(dsn)

    if connection.type == DatabaseType.ORACLE:
        from app.infrastructure.db.oracle_client import OracleClient

        return OracleClient(connection.host, connection.port, connection.database, connection.username, connection.password, connection.additional_options or {})

    if connection.type == DatabaseType.SQLITE:
        from app.infrastructure.db.sqlite_client import SQLiteClient

        database_path = connection.database
        if database_path == ":memory:":
            dsn = "sqlite+aiosqlite:///:memory:"
        else:
            dsn = f"sqlite+aiosqlite:///{database_path}"
        return SQLiteClient(dsn)

    if connection.type == DatabaseType.MONGODB:
        from app.infrastructure.db.mongodb_client import MongoClient, build_mongo_uri

        options = connection.additional_options or {}
        uri = build_mongo_uri(
            connection.host,
            connection.username,
            connection.password,
            connection.port or None,
            scheme=options.get("source_uri_scheme"),
            query=options.get("uri_query") or {},
        )
        return MongoClient(uri, connection.database)

    if connection.type == DatabaseType.REDIS:
        from app.infrastructure.db.redis_client import RedisClient

        options = connection.additional_options or {}
        db_index = int(connection.database or 0)
        return RedisClient(
            connection.host,
            connection.port,
            connection.username,
            connection.password,
            db_index,
            scheme=options.get("source_uri_scheme"),
            options=options,
        )

    if connection.type == DatabaseType.NEO4J:
        from app.infrastructure.db.neo4j_client import Neo4jClient

        options = connection.additional_options or {}
        return Neo4jClient(
            connection.host,
            connection.port,
            connection.database,
            connection.username,
            connection.password,
            options.get("source_uri_scheme"),
            options=options,
        )

    if connection.type == DatabaseType.CASSANDRA:
        from app.infrastructure.db.cassandra_client import CassandraClient

        return CassandraClient(connection.host, connection.port, connection.database, connection.username, connection.password, connection.additional_options or {})

    raise ValueError(f"Motor no soportado: {connection.type}")


def is_document_database(connection: ConnectionConfig) -> bool:
    return connection.type in {DatabaseType.MONGODB, DatabaseType.REDIS}


def is_graph_database(connection: ConnectionConfig) -> bool:
    return connection.type == DatabaseType.NEO4J


def is_sql_database(connection: ConnectionConfig) -> bool:
    return connection.type in {
        DatabaseType.POSTGRES,
        DatabaseType.MYSQL,
        DatabaseType.MARIADB,
        DatabaseType.SQLITE,
        DatabaseType.SQLSERVER,
        DatabaseType.ORACLE,
        DatabaseType.CASSANDRA,
    }
