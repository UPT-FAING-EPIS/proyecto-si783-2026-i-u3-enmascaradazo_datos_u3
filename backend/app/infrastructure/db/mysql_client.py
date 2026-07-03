from typing import Dict, List, Optional

from app.infrastructure.db.sqlalchemy_client import SQLAlchemyClient


class MySQLClient(SQLAlchemyClient):
    def __init__(self, dsn: str):
        super().__init__(dsn, quote_char='`')

    async def get_schema(self) -> Dict[str, List[str]]:
        query = """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            ORDER BY table_name, ordinal_position
        """
        records = await self.fetch_all(query)
        schema: Dict[str, List[str]] = {}
        for record in records:
            schema.setdefault(record["table_name"], []).append(record["column_name"])
        return schema

    async def get_primary_key(self, table: str) -> Optional[str]:
        table_name = table.split(".")[-1]
        query = """
            SELECT column_name
            FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE()
              AND table_name = :table_name
              AND constraint_name = 'PRIMARY'
            ORDER BY ordinal_position
        """
        rows = await self.fetch_all(query, {"table_name": table_name})
        return rows[0]["column_name"] if rows else None
