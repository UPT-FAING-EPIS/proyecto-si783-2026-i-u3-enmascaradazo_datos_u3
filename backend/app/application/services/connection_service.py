from typing import List

from app.application.schemas import (
    ConnectionCreate,
    ConnectionResponse,
    ConnectionTestResponse,
    RuleCreate,
    SupportedDatabaseInfo,
)
from app.core.exceptions import ResourceNotFoundError
from app.domain.entities.connection import ConnectionConfig
from app.domain.interfaces.repository import ConnectionRepository
from app.domain.services.pii_detector import pii_detector
from app.domain.value_objects.protection_mode import ProtectionMode
from app.infrastructure.db.factory import (
    create_database_client,
    normalize_connection_config,
    supported_database_capabilities,
)
from app.infrastructure.repositories.memory_repository import connection_repository


def _friendly_connection_error(exc: Exception) -> str:
    raw = str(exc)
    lowered = raw.lower()
    hints = []

    if "odbc driver" in lowered and ("can't open lib" in lowered or "not found" in lowered or "data source name not found" in lowered):
        hints.append("SQL Server: falta instalar Microsoft ODBC Driver 18 dentro del entorno donde corre el backend.")
    if "login timeout" in lowered or "timed out" in lowered or "timeout expired" in lowered:
        hints.append("SQL Server: revisa que TCP/IP esté habilitado, que el puerto 1433 esté abierto y que no estés usando localhost desde Docker.")
    if "login failed" in lowered or "authentication failed" in lowered:
        hints.append("SQL Server: usuario, contraseña o modo de autenticación incorrecto. Activa SQL Server Authentication o usa un login SQL válido.")
    if "certificate" in lowered or "ssl" in lowered or "tls" in lowered:
        hints.append("SQL Server: Driver 18 usa cifrado; para desarrollo local usa TrustServerCertificate=yes.")
    if "server was not found" in lowered or "network-related" in lowered or "connection refused" in lowered:
        hints.append("Host/puerto no accesible. Si el backend corre en Docker, prueba host.docker.internal en vez de localhost; si es nube, revisa firewall/IP permitida.")
    if "redis" in lowered or "rediss" in lowered:
        if "ssl" in lowered or "tls" in lowered or "certificate" in lowered:
            hints.append("Redis: si usas Redis Cloud, prueba URI rediss:// o agrega ssl=true/ssl_cert_reqs=none solo en laboratorio.")
        if "authentication" in lowered or "invalid username" in lowered or "wrongpass" in lowered:
            hints.append("Redis: revisa usuario ACL y contraseña; en algunos servicios el usuario es default.")
    if "nohostavailable" in lowered or "unable to connect to any servers" in lowered:
        hints.append("Cassandra: revisa contact_points, puerto 9042, local_datacenter, SSL o secure_connect_bundle si es Astra/cloud.")
    if "invalid keyspace" in lowered or "keyspace" in lowered and "does not exist" in lowered:
        hints.append("Cassandra: el keyspace/base indicada no existe o el usuario no tiene permisos.")
    if "neo4j" in lowered or "bolt" in lowered:
        if "unauthorized" in lowered or "authentication" in lowered:
            hints.append("Neo4j: usuario o contraseña incorrectos.")
        if "routing" in lowered or "service unavailable" in lowered:
            hints.append("Neo4j: para Aura usa URI completa neo4j+s://... y puerto Bolt 7687, no el puerto web 7474.")
    if "ora-" in lowered or "oracle" in lowered:
        if "ora-01017" in lowered:
            hints.append("Oracle: usuario o contraseña incorrectos.")
        if "ora-12154" in lowered or "ora-12514" in lowered or "ora-12541" in lowered:
            hints.append("Oracle: revisa service name/SID, host/puerto 1521/1522, wallet/config_dir o TNS alias si es cloud.")

    if hints:
        return f"No se pudo conectar: {raw}. Sugerencia: " + " ".join(hints)
    return f"No se pudo conectar: {raw}"


class ConnectionService:
    def __init__(self, repository: ConnectionRepository):
        self._repository = repository

    def get_supported_databases(self) -> List[SupportedDatabaseInfo]:
        return [SupportedDatabaseInfo(**capability.__dict__) for capability in supported_database_capabilities()]

    async def create_connection(self, data: ConnectionCreate, owner_id: str) -> ConnectionResponse:
        connection = normalize_connection_config(ConnectionConfig(**data.model_dump(), owner_id=owner_id))
        created = await self._repository.create(connection)
        return ConnectionResponse.model_validate(created.model_dump())

    async def test_connection(self, data: ConnectionCreate) -> ConnectionTestResponse:
        connection = normalize_connection_config(ConnectionConfig(**data.model_dump()))
        try:
            client = create_database_client(connection)
            await client.test_connection()
            return ConnectionTestResponse(
                success=True,
                message="Conexión exitosa con el motor seleccionado.",
                type=connection.type,
                host=connection.host,
                port=connection.port,
                database=connection.database,
            )
        except Exception as exc:
            return ConnectionTestResponse(
                success=False,
                message=_friendly_connection_error(exc),
                type=connection.type,
                host=connection.host,
                port=connection.port,
                database=connection.database,
            )

    async def test_existing_connection(self, id: str, owner_id: str) -> ConnectionTestResponse:
        connection = await self._repository.get_by_id(id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", id)
        try:
            client = create_database_client(connection)
            await client.test_connection()
            return ConnectionTestResponse(
                success=True,
                message="Conexión exitosa con el motor seleccionado.",
                type=connection.type,
                host=connection.host,
                port=connection.port,
                database=connection.database,
            )
        except Exception as exc:
            return ConnectionTestResponse(
                success=False,
                message=_friendly_connection_error(exc),
                type=connection.type,
                host=connection.host,
                port=connection.port,
                database=connection.database,
            )

    async def get_all_connections(self, owner_id: str) -> List[ConnectionResponse]:
        connections = await self._repository.get_all()
        owned_connections = [c for c in connections if getattr(c, "owner_id", None) == owner_id]
        return [ConnectionResponse.model_validate(c.model_dump()) for c in owned_connections]

    async def get_connection(self, id: str, owner_id: str) -> ConnectionResponse:
        connection = await self._repository.get_by_id(id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", id)
        return ConnectionResponse.model_validate(connection.model_dump())

    async def delete_connection(self, id: str, owner_id: str) -> bool:
        connection = await self._repository.get_by_id(id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", id)
        success = await self._repository.delete(id)
        if not success:
            raise ResourceNotFoundError("Connection", id)
        return True

    async def discover_pii(self, id: str, owner_id: str) -> List[RuleCreate]:
        connection = await self._repository.get_by_id(id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", id)

        client = create_database_client(connection)
        schema = await client.get_schema()

        suggestions = pii_detector.discover(schema)
        return [
            RuleCreate(
                name=f"Auto-{s.target_table}-{s.target_column}",
                connection_id=id,
                target_table=s.target_table,
                target_column=s.target_column,
                strategy=s.strategy,
                strategy_options=s.strategy_options,
                protection_mode=ProtectionMode.MASKED_VIEW,
                output_column=f"{s.target_column}_masked",
                graph_element=s.graph_element,
            )
            for s in suggestions
        ]


connection_service = ConnectionService(connection_repository)
