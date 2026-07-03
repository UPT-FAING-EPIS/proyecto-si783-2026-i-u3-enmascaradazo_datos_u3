from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

from app.infrastructure.db.sql_utils import quote_mssql_identifier
from app.infrastructure.db.sqlalchemy_client import SQLAlchemyClient


def _yes_no(value: Any, default: str) -> str:
    if value is None or value == "":
        return default
    raw = str(value).strip().lower()
    if raw in {"1", "true", "yes", "y", "si", "sí"}:
        return "yes"
    if raw in {"0", "false", "no", "n"}:
        return "no"
    return str(value)


def _build_server_value(host: str, port: Optional[int]) -> str:
    """Return the SERVER value expected by Microsoft ODBC.

    SQL Server ODBC uses SERVER=host,port for TCP ports, not host:port.
    Named instances use SERVER=HOST\\INSTANCE and normally should not append
    a port unless the user explicitly writes HOST,PORT in the host field.
    """
    cleaned_host = (host or "").strip()
    if not cleaned_host:
        return cleaned_host

    if "," in cleaned_host:
        return cleaned_host

    if "\\" in cleaned_host:
        return cleaned_host

    if port and int(port) > 0:
        return f"{cleaned_host},{int(port)}"

    return cleaned_host


class SQLServerClient(SQLAlchemyClient):
    """Cliente SQL Server mediante SQLAlchemy + aioodbc.

    Mejora principal:
    - Enmask trabaja con nombres completos schema.tabla: dbo.Clientes,
      Person.BusinessEntity, SalesLT.Customer, etc.
    - Si el usuario escribe una tabla simple y existe una sola coincidencia, se
      resuelve automáticamente a su schema real para evitar Invalid object name.
    """

    def __init__(self, dsn: str):
        super().__init__(dsn, quote_char='"')
        self._schema_cache: Optional[Dict[str, List[str]]] = None

    def q(self, identifier: str) -> str:
        return quote_mssql_identifier(identifier)

    async def get_schema(self) -> Dict[str, List[str]]:
        if self._schema_cache is not None:
            return self._schema_cache
        query = """
            SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_CATALOG = DB_NAME()
              AND TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA', 'sys')
            ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
        """
        records = await self.fetch_all(query)
        schema: Dict[str, List[str]] = {}
        for record in records:
            full_name = f"{record['TABLE_SCHEMA']}.{record['TABLE_NAME']}"
            schema.setdefault(full_name, []).append(record["COLUMN_NAME"])
        self._schema_cache = schema
        return schema

    async def resolve_table_name(self, table: str) -> str:
        """Return schema.table for SQL Server tables.

        SQL Server accepts simple names only when the object lives in the
        user's default schema. Cloud/sample DBs commonly use Person, Sales,
        SalesLT, Production, etc., so Enmask should qualify the schema.
        """
        raw = (table or "").strip()
        if "." in raw:
            return raw
        schema = await self.get_schema()
        matches = [name for name in schema.keys() if name.split(".")[-1].lower() == raw.lower()]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise ValueError(
                f"La tabla '{raw}' existe en varios schemas: {', '.join(matches)}. "
                "Selecciona el nombre completo schema.tabla."
            )
        return raw

    async def get_primary_key(self, table: str) -> Optional[str]:
        resolved = await self.resolve_table_name(table)
        table_name = resolved.split(".")[-1]
        schema_name = resolved.split(".")[0] if "." in resolved else None
        query = """
            SELECT KU.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU
              ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME
             AND TC.TABLE_SCHEMA = KU.TABLE_SCHEMA
             AND TC.TABLE_NAME = KU.TABLE_NAME
            WHERE TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
              AND TC.TABLE_NAME = :table_name
              AND (:schema_name IS NULL OR TC.TABLE_SCHEMA = :schema_name)
            ORDER BY KU.ORDINAL_POSITION
        """
        rows = await self.fetch_all(query, {"table_name": table_name, "schema_name": schema_name})
        return rows[0]["COLUMN_NAME"] if rows else None

    async def add_text_column(self, table: str, column: str) -> None:
        resolved = await self.resolve_table_name(table)
        schema = await self.get_schema()
        columns = schema.get(resolved) or []
        if column in columns:
            return
        await self.execute(f"ALTER TABLE {self.q(resolved)} ADD {self.q(column)} NVARCHAR(MAX) NULL")
        self._schema_cache = None

    async def drop_column(self, table: str, column: str) -> None:
        resolved = await self.resolve_table_name(table)
        schema = await self.get_schema()
        columns = schema.get(resolved) or []
        if column not in columns:
            return
        await self.execute(f"ALTER TABLE {self.q(resolved)} DROP COLUMN {self.q(column)}")
        self._schema_cache = None

    async def select_all(self, table: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        resolved = await self.resolve_table_name(table)
        if limit is not None:
            safe_limit = max(1, min(int(limit), 10000))
            query = f"SELECT TOP ({safe_limit}) * FROM {self.q(resolved)}"
        else:
            query = f"SELECT * FROM {self.q(resolved)}"
        return await self.fetch_all(query)

    async def update_record(self, table: str, record_id_col: str, record_id: Any, updates: Dict[str, Any]):
        resolved = await self.resolve_table_name(table)
        return await super().update_record(resolved, record_id_col, record_id, updates)


def build_sqlserver_dsn(
    username: str,
    password: str,
    host: str,
    port: int,
    database: str,
    driver: str = "ODBC Driver 18 for SQL Server",
    *,
    encrypt: Any = "yes",
    trust_server_certificate: Any = "yes",
    timeout: Any = 10,
) -> str:
    """Build a robust SQLAlchemy URL for SQL Server through aioodbc."""
    parts = [
        f"DRIVER={{{driver}}}",
        f"SERVER={_build_server_value(host, port)}",
        f"DATABASE={database}",
        f"Encrypt={_yes_no(encrypt, 'yes')}",
        f"TrustServerCertificate={_yes_no(trust_server_certificate, 'yes')}",
        f"Connection Timeout={int(timeout or 10)}",
    ]

    if username:
        parts.append(f"UID={username}")
    if password:
        parts.append(f"PWD={password}")

    odbc_connect = ";".join(parts) + ";"
    return f"mssql+aioodbc:///?odbc_connect={quote_plus(odbc_connect)}"
