from typing import Dict, List, Optional

from app.infrastructure.db.sqlalchemy_client import SQLAlchemyClient


class PostgresClient(SQLAlchemyClient):
    def __init__(self, dsn: str):
        super().__init__(dsn, quote_char='"')

    async def get_schema(self) -> Dict[str, List[str]]:
        query = """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        """
        records = await self.fetch_all(query)
        schema: Dict[str, List[str]] = {}
        for record in records:
            schema.setdefault(record["table_name"], []).append(record["column_name"])
        return schema

    async def get_primary_key(self, table: str) -> Optional[str]:
        # Solo se admite public.table o table para evitar ambiguedades.
        table_name = table.split(".")[-1]
        query = """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
             AND tc.table_name = kcu.table_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = 'public'
              AND tc.table_name = :table_name
            ORDER BY kcu.ordinal_position
        """
        rows = await self.fetch_all(query, {"table_name": table_name})
        return rows[0]["column_name"] if rows else None
