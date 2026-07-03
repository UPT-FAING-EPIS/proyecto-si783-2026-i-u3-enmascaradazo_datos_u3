from __future__ import annotations

import asyncio
import ssl
from typing import Any, Dict, List, Optional

from app.infrastructure.db.sql_utils import validate_identifiers


def _truthy(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "si", "sí", "require"}


def _split_hosts(host: str) -> List[str]:
    raw = (host or "").strip()
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


class CassandraClient:
    """Cliente Cassandra/CQL con soporte mejorado para nubes y clusters.

    Soporta:
    - host simple: localhost
    - multiples contact points: host1,host2,host3
    - URI cassandra://user:pass@host:9042/keyspace?local_datacenter=datacenter1
    - TLS: ?ssl=true
    - DataStax Astra/secure connect bundle: ?secure_connect_bundle=C:/ruta/bundle.zip

    CQL no ofrece vistas SQL equivalentes para este caso. Por eso masked_view se
    registra como artefacto virtual, mientras masked_column/static/encryption se
    aplican sobre columnas fisicas cuando el esquema lo permite.
    """

    def __init__(self, host: str, port: int, keyspace: str, username: str, password: str, options: Dict[str, Any]):
        self.host = host
        self.port = port or 9042
        self.keyspace = keyspace
        self.username = username
        self.password = password
        self.options = options or {}
        self.uri_query = self.options.get("uri_query") or {}
        self._cluster = None
        self._session = None

    def q(self, identifier: str) -> str:
        # En Cassandra aceptamos keyspace.tabla y columnas simples seguras.
        validate_identifiers(str(identifier).split("."))
        return identifier

    def _option(self, *names: str, default: Any = None) -> Any:
        for name in names:
            if name in self.options and self.options[name] not in (None, ""):
                return self.options[name]
            if name in self.uri_query and self.uri_query[name] not in (None, ""):
                return self.uri_query[name]
        return default

    def _connect_sync(self):
        if self._session:
            return self._session
        from cassandra.auth import PlainTextAuthProvider
        from cassandra.cluster import Cluster, ExecutionProfile, EXEC_PROFILE_DEFAULT
        from cassandra.policies import DCAwareRoundRobinPolicy

        auth = PlainTextAuthProvider(username=self.username, password=self.password) if self.username else None
        secure_bundle = self._option("secure_connect_bundle", "cloud_bundle", "bundle", "secureConnectBundle")
        connect_timeout = float(self._option("connect_timeout", "timeout", default=15))
        request_timeout = float(self._option("request_timeout", default=20))
        protocol_version = self._option("protocol_version")
        local_dc = self._option("local_datacenter", "local_dc", "datacenter")

        kwargs: Dict[str, Any] = {
            "auth_provider": auth,
            "connect_timeout": connect_timeout,
            "control_connection_timeout": connect_timeout,
            "idle_heartbeat_interval": int(self._option("heartbeat_interval", default=30)),
        }
        if protocol_version:
            kwargs["protocol_version"] = int(protocol_version)
        if local_dc:
            kwargs["execution_profiles"] = {
                EXEC_PROFILE_DEFAULT: ExecutionProfile(
                    load_balancing_policy=DCAwareRoundRobinPolicy(local_dc=str(local_dc)),
                    request_timeout=request_timeout,
                )
            }
        if _truthy(self._option("ssl", "tls", default=False)):
            context = ssl.create_default_context()
            if str(self._option("ssl_cert_reqs", default="required")).lower() in {"none", "false", "0", "no"}:
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
            kwargs["ssl_context"] = context

        if secure_bundle:
            self._cluster = Cluster(cloud={"secure_connect_bundle": str(secure_bundle)}, **kwargs)
        else:
            contact_points = _split_hosts(str(self._option("contact_points", default=self.host)))
            if not contact_points:
                raise ValueError("Cassandra requiere host/contact_points o secure_connect_bundle.")
            self._cluster = Cluster(contact_points=contact_points, port=self.port, **kwargs)

        self._session = self._cluster.connect(self.keyspace) if self.keyspace else self._cluster.connect()
        return self._session

    async def _session_async(self):
        return await asyncio.to_thread(self._connect_sync)

    async def test_connection(self) -> None:
        session = await self._session_async()
        await asyncio.to_thread(lambda: list(session.execute("SELECT release_version FROM system.local")))

    async def fetch_all(self, query: str, params: Optional[Dict[str, Any] | tuple | list] = None) -> List[Dict[str, Any]]:
        session = await self._session_async()

        def _run():
            if isinstance(params, dict):
                bind = tuple(params.values())
            else:
                bind = params
            result = session.execute(query, bind)
            return [dict(row._asdict()) for row in result]

        return await asyncio.to_thread(_run)

    async def execute(self, query: str, params: Optional[Dict[str, Any] | tuple | list] = None) -> str:
        session = await self._session_async()

        def _run():
            if isinstance(params, dict):
                bind = tuple(params.values())
            else:
                bind = params
            session.execute(query, bind)
            return "OK"

        return await asyncio.to_thread(_run)

    async def get_schema(self) -> Dict[str, List[str]]:
        session = await self._session_async()

        def _run():
            rows = session.execute(
                "SELECT table_name, column_name FROM system_schema.columns WHERE keyspace_name=%s",
                (self.keyspace,),
            )
            schema: Dict[str, List[str]] = {}
            for row in rows:
                schema.setdefault(row.table_name, []).append(row.column_name)
            return schema

        return await asyncio.to_thread(_run)

    async def get_primary_key_columns(self, table: str) -> List[str]:
        table_name = table.split(".")[-1]
        session = await self._session_async()

        def _run():
            rows = session.execute(
                "SELECT column_name, kind, position FROM system_schema.columns WHERE keyspace_name=%s AND table_name=%s",
                (self.keyspace, table_name),
            )
            # En Cassandra el WHERE del UPDATE necesita todas las columnas de la
            # partition key y, si existen, las clustering keys para identificar una fila.
            pk = sorted([r for r in rows if r.kind in ("partition_key", "clustering")], key=lambda r: (0 if r.kind == "partition_key" else 1, r.position))
            return [r.column_name for r in pk]

        return await asyncio.to_thread(_run)

    async def get_primary_key(self, table: str) -> Optional[str]:
        cols = await self.get_primary_key_columns(table)
        return cols[0] if cols else None

    async def select_all(self, table: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        query = f"SELECT * FROM {self.q(table)}"
        if limit is not None:
            query += f" LIMIT {max(1, min(int(limit), 10000))}"
        return await self.fetch_all(query)

    async def create_view(self, view_name: str, select_sql: str, replace: bool = True) -> None:
        return None

    async def drop_view(self, view_name: str) -> None:
        return None

    async def add_text_column(self, table: str, column: str) -> None:
        schema = await self.get_schema()
        table_name = table.split(".")[-1]
        if column in schema.get(table_name, []):
            return
        await self.execute(f"ALTER TABLE {self.q(table)} ADD {self.q(column)} text")

    async def drop_column(self, table: str, column: str) -> None:
        schema = await self.get_schema()
        table_name = table.split(".")[-1]
        if column not in schema.get(table_name, []):
            return
        await self.execute(f"ALTER TABLE {self.q(table)} DROP {self.q(column)}")

    async def update_record(self, table: str, record_id_col: str, record_id: Any, updates: Dict[str, Any]):
        pk_cols = [c.strip() for c in str(record_id_col).split(",") if c.strip()]
        if isinstance(record_id, dict):
            pk_values = [record_id.get(col) for col in pk_cols]
        elif len(pk_cols) == 1:
            pk_values = [record_id]
        else:
            raise ValueError("Cassandra requiere valores de todas las columnas primary key para actualizar.")

        if not pk_cols or any(value is None for value in pk_values):
            raise ValueError("No se pudo determinar la primary key completa para Cassandra.")

        set_clause = ", ".join([f"{self.q(col)} = %s" for col in updates.keys()])
        where_clause = " AND ".join([f"{self.q(col)} = %s" for col in pk_cols])
        query = f"UPDATE {self.q(table)} SET {set_clause} WHERE {where_clause}"
        session = await self._session_async()
        values = tuple(updates.values()) + tuple(pk_values)
        await asyncio.to_thread(lambda: session.execute(query, values))
