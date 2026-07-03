from typing import Dict, List, Optional

from app.infrastructure.db.sqlalchemy_client import SQLAlchemyClient


class SQLiteClient(SQLAlchemyClient):
    def __init__(self, dsn: str):
        super().__init__(dsn, quote_char='"')

    async def get_schema(self) -> Dict[str, List[str]]:
        tables = await self.fetch_all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        schema: Dict[str, List[str]] = {}
        for table in tables:
            table_name = table["name"]
            columns = await self.fetch_all(f"PRAGMA table_info({self.q(table_name)})")
            schema[table_name] = [col["name"] for col in columns]
        return schema

    async def get_primary_key(self, table: str) -> Optional[str]:
        table_name = table.split(".")[-1]
        columns = await self.fetch_all(f"PRAGMA table_info({self.q(table_name)})")
        primary_keys = [col["name"] for col in columns if col.get("pk")]
        return primary_keys[0] if primary_keys else None
