from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.infrastructure.db.sql_utils import quote_identifier


class SQLAlchemyClient:
    def __init__(self, dsn: str, quote_char: str = '"'):
        self.engine: AsyncEngine = create_async_engine(dsn, future=True, echo=False, pool_pre_ping=True)
        self.quote_char = quote_char

    def q(self, identifier: str) -> str:
        return quote_identifier(identifier, self.quote_char)

    async def test_connection(self) -> None:
        async with self.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        async with self.engine.connect() as conn:
            result = await conn.execute(text(query), *args)
            return [dict(row) for row in result.mappings().all()]

    async def execute(self, query: str, *args) -> str:
        async with self.engine.connect() as conn:
            result = await conn.execute(text(query), *args)
            await conn.commit()
            return str(result)


    async def create_view(self, view_name: str, select_sql: str, replace: bool = True) -> None:
        safe_view = self.q(view_name)
        if replace:
            await self.drop_view(view_name)
        query = f"CREATE VIEW {safe_view} AS {select_sql}"
        await self.execute(query)

    async def drop_view(self, view_name: str) -> None:
        await self.execute(f"DROP VIEW IF EXISTS {self.q(view_name)}")

    async def add_text_column(self, table: str, column: str) -> None:
        schema = await self.get_schema()
        table_name = table.split(".")[-1]
        columns = schema.get(table) or schema.get(table_name) or []
        if column in columns:
            return
        await self.execute(f"ALTER TABLE {self.q(table)} ADD COLUMN {self.q(column)} TEXT")

    async def drop_column(self, table: str, column: str) -> None:
        schema = await self.get_schema()
        table_name = table.split(".")[-1]
        columns = schema.get(table) or schema.get(table_name) or []
        if column not in columns:
            return
        await self.execute(f"ALTER TABLE {self.q(table)} DROP COLUMN {self.q(column)}")

    async def select_all(self, table: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        query = f"SELECT * FROM {self.q(table)}"
        params: Dict[str, Any] = {}
        if limit is not None:
            query += " LIMIT :limit"
            params["limit"] = limit
        return await self.fetch_all(query, params)

    async def update_record(self, table: str, record_id_col: str, record_id: Any, updates: Dict[str, Any]):
        safe_table = self.q(table)
        safe_pk = self.q(record_id_col)
        set_clause = ", ".join([f"{self.q(column)} = :v_{index}" for index, column in enumerate(updates.keys())])
        parameters = {f"v_{index}": value for index, value in enumerate(updates.values())}
        parameters["record_id"] = record_id
        query = text(f"UPDATE {safe_table} SET {set_clause} WHERE {safe_pk} = :record_id")
        async with self.engine.connect() as conn:
            await conn.execute(query, parameters)
            await conn.commit()
