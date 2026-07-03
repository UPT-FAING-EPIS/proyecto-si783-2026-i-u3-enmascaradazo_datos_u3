from enum import Enum


class DatabaseType(str, Enum):
    """Motores soportados por el backend.

    Relacionales:
    - PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle, Cassandra/CQL.

    No relacionales:
    - MongoDB, Redis, Neo4j.

    Nota: MariaDB reutiliza el cliente MySQL porque comparten protocolo.
    SQLite se usa principalmente para pruebas/local y no requiere host/puerto.
    Redis y Neo4j no tienen vistas SQL nativas; para esos motores el modo
    masked_view se implementa como artefacto virtual de consulta desde Enmask.
    """

    POSTGRES = "postgres"
    MYSQL = "mysql"
    MARIADB = "mariadb"
    SQLITE = "sqlite"
    SQLSERVER = "sqlserver"
    ORACLE = "oracle"
    CASSANDRA = "cassandra"
    MONGODB = "mongodb"
    REDIS = "redis"
    NEO4J = "neo4j"
