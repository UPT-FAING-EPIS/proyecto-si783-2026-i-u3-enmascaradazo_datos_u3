from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from app.infrastructure.db.sql_utils import quote_identifier


class OracleClient:
    """Cliente Oracle en modo thin mediante python-oracledb.

    Soporta Oracle local/remoto por host:puerto/service_name y conexiones cloud
    con opciones de wallet/TNS cuando se pasan en la URI/query:
    - oracle://user:pass@host:1521/XEPDB1
    - oracle://user:pass@host:1522/service?protocol=tcps
    - oracle://user:pass@tns_alias/service?config_dir=C:/wallet&wallet_password=...

    El parametro database representa service name, SID o database/alias elegido.
    """

    def __init__(
        self,
        host: str,
        port: int,
        service_name: str,
        username: str,
        password: str,
        options: Dict[str, Any] | None = None,
    ):
        self.host = host
        self.port = port or 1521
        self.service_name = service_name
        self.username = username
        self.password = password
        self.options = options or {}
        self.uri_query = self.options.get("uri_query") or {}
        self._current_schema: Optional[str] = None
        self._schema_cache: Optional[Dict[str, List[str]]] = None

    def _option(self, *names: str, default: Any = None) -> Any:
        for name in names:
            if name in self.options and self.options[name] not in (None, ""):
                return self.options[name]
            if name in self.uri_query and self.uri_query[name] not in (None, ""):
                return self.uri_query[name]
        return default

    def _dsn(self) -> str:
        import oracledb

        tns_alias = self._option("tns_alias", "dsn", "connect_string")
        if tns_alias:
            return str(tns_alias)

        default_protocol = "tcps" if str(self.options.get("source_uri_scheme", "")).lower() == "oracle+tcps" else "tcp"
        protocol = str(self._option("protocol", default=default_protocol)).lower()
        sid = self._option("sid")
        service_name = self._option("service_name", "service", default=self.service_name)
        if sid:
            return oracledb.makedsn(self.host, int(self.port or 1521), sid=str(sid))
        if protocol == "tcps":
            # makedsn no expone protocol en versiones antiguas de oracledb, por
            # eso armamos el DESCRIPTION manualmente para TCPS/cloud.
            return (
                f"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(HOST={self.host})(PORT={int(self.port or 1522)}))"
                f"(CONNECT_DATA=(SERVICE_NAME={service_name})))"
            )
        return oracledb.makedsn(self.host, int(self.port or 1521), service_name=str(service_name))

    def _connect(self):
        import oracledb

        kwargs: Dict[str, Any] = {
            "user": self.username,
            "password": self.password,
            "dsn": self._dsn(),
        }
        config_dir = self._option("config_dir", "wallet_location", "wallet_dir")
        wallet_password = self._option("wallet_password")
        if config_dir:
            kwargs["config_dir"] = str(config_dir)
            kwargs["wallet_location"] = str(config_dir)
        if wallet_password:
            kwargs["wallet_password"] = str(wallet_password)
        return oracledb.connect(**kwargs)

    def q(self, identifier: str) -> str:
        parts = [p.strip().upper() for p in str(identifier).split(".") if p.strip()]
        return ".".join(quote_identifier(part, '"') for part in parts)

    async def test_connection(self) -> None:
        await self.fetch_all("SELECT 1 AS ok FROM dual")

    async def fetch_all(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        def _run():
            with self._connect() as conn:
                cur = conn.cursor()
                cur.execute(query, params or {})
                cols = [d[0].lower() for d in cur.description] if cur.description else []
                return [dict(zip(cols, row)) for row in cur.fetchall()]

        return await asyncio.to_thread(_run)

    async def execute(self, query: str, params: Optional[Dict[str, Any]] = None) -> str:
        def _run():
            with self._connect() as conn:
                cur = conn.cursor()
                cur.execute(query, params or {})
                conn.commit()
                return str(cur.rowcount)

        return await asyncio.to_thread(_run)

    async def _current_user(self) -> str:
        if self._current_schema:
            return self._current_schema
        rows = await self.fetch_all("SELECT USER AS username FROM dual")
        self._current_schema = str(rows[0]["username"]).upper() if rows else (self.username or "").upper()
        return self._current_schema

    async def get_schema(self) -> Dict[str, List[str]]:
        if self._schema_cache is not None:
            return self._schema_cache
        query = """
            SELECT owner, table_name, column_name
            FROM all_tab_columns
            WHERE owner NOT IN ('SYS','SYSTEM','XDB','MDSYS','CTXSYS','ORDSYS','WMSYS','OUTLN','DBSNMP')
            ORDER BY owner, table_name, column_id
        """
        rows = await self.fetch_all(query)
        schema: Dict[str, List[str]] = {}
        for row in rows:
            owner = str(row["owner"]).lower()
            table = str(row["table_name"]).lower()
            column = str(row["column_name"]).lower()
            schema.setdefault(f"{owner}.{table}", []).append(column)
        self._schema_cache = schema
        return schema

    async def resolve_table_name(self, table: str) -> str:
        raw = (table or "").strip().lower()
        if "." in raw:
            return raw
        schema = await self.get_schema()
        matches = [name for name in schema.keys() if name.split(".")[-1].lower() == raw]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise ValueError(
                f"La tabla Oracle '{raw}' existe en varios schemas: {', '.join(matches)}. "
                "Selecciona owner.tabla."
            )
        current = (await self._current_user()).lower()
        return f"{current}.{raw}"

    async def get_primary_key(self, table: str) -> Optional[str]:
        resolved = await self.resolve_table_name(table)
        owner = resolved.split(".")[0].upper() if "." in resolved else (await self._current_user())
        table_name = resolved.split(".")[-1].upper()
        query = """
            SELECT cols.column_name
            FROM all_constraints cons
            JOIN all_cons_columns cols
              ON cons.owner = cols.owner
             AND cons.constraint_name = cols.constraint_name
             AND cons.table_name = cols.table_name
            WHERE cons.constraint_type = 'P'
              AND cons.owner = :owner
              AND cons.table_name = :table_name
            ORDER BY cols.position
        """
        rows = await self.fetch_all(query, {"owner": owner, "table_name": table_name})
        return str(rows[0]["column_name"]).lower() if rows else None

    async def select_all(self, table: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        resolved = await self.resolve_table_name(table)
        query = f"SELECT * FROM {self.q(resolved)}"
        if limit is not None:
            query += f" FETCH FIRST {max(1, min(int(limit), 10000))} ROWS ONLY"
        return await self.fetch_all(query)

    async def create_view(self, view_name: str, select_sql: str, replace: bool = True) -> None:
        if replace:
            await self.drop_view(view_name)
        await self.execute(f"CREATE VIEW {self.q(view_name)} AS {select_sql}")

    async def drop_view(self, view_name: str) -> None:
        try:
            await self.execute(f"DROP VIEW {self.q(view_name)}")
        except Exception:
            return

    async def add_text_column(self, table: str, column: str) -> None:
        resolved = await self.resolve_table_name(table)
        schema = await self.get_schema()
        if column.lower() in schema.get(resolved, []):
            return
        await self.execute(f"ALTER TABLE {self.q(resolved)} ADD ({self.q(column)} VARCHAR2(4000))")
        self._schema_cache = None

    async def drop_column(self, table: str, column: str) -> None:
        resolved = await self.resolve_table_name(table)
        schema = await self.get_schema()
        if column.lower() not in schema.get(resolved, []):
            return
        await self.execute(f"ALTER TABLE {self.q(resolved)} DROP COLUMN {self.q(column)}")
        self._schema_cache = None

    async def update_record(self, table: str, record_id_col: str, record_id: Any, updates: Dict[str, Any]):
        resolved = await self.resolve_table_name(table)
        set_clause = ", ".join([f"{self.q(col)} = :v_{idx}" for idx, col in enumerate(updates.keys())])
        params = {f"v_{idx}": value for idx, value in enumerate(updates.values())}
        params["record_id"] = record_id
        await self.execute(f"UPDATE {self.q(resolved)} SET {set_clause} WHERE {self.q(record_id_col)} = :record_id", params)
