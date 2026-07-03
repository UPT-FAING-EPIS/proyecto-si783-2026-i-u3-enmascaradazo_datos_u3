import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.domain.interfaces.vault_repository import VaultRepository


class MemoryVaultRepository(VaultRepository):
    def __init__(self):
        # job_id -> list of backup records
        self._data: Dict[str, List[Dict[str, Any]]] = {}

    async def save_backup(
        self,
        job_id: str,
        table_name: str,
        record_pk: str,
        original_data: Dict[str, Any],
        pk_column: Optional[str] = None,
    ) -> None:
        if job_id not in self._data:
            self._data[job_id] = []

        self._data[job_id].append({
            "job_id": job_id,
            "table_name": table_name,
            "pk_column": pk_column,
            "record_pk": record_pk,
            "original_data": original_data,
        })

    async def get_backups_for_job(self, job_id: str) -> List[Dict[str, Any]]:
        return self._data.get(job_id, [])

    async def delete_backups_for_job(self, job_id: str) -> None:
        if job_id in self._data:
            del self._data[job_id]


class FileVaultRepository(VaultRepository):
    """Vault persistente para localhost.

    Enmascaramiento fisico y cifrado necesitan restauracion posterior. Si el vault
    queda solo en memoria, al reiniciar el backend se pierde la posibilidad de
    restaurar. Por eso para modo local se usa este JSON persistente.
    """

    def __init__(self, path: str = "data/vault_backups.json"):
        self.path = Path(path)
        if not self.path.is_absolute():
            # El backend normalmente se ejecuta desde backend/. Guardamos dentro de backend/data.
            self.path = Path.cwd() / self.path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("{}", encoding="utf-8")

    def _read_all(self) -> Dict[str, List[Dict[str, Any]]]:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8") or "{}")
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def _write_all(self, data: Dict[str, List[Dict[str, Any]]]) -> None:
        self.path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    async def save_backup(
        self,
        job_id: str,
        table_name: str,
        record_pk: str,
        original_data: Dict[str, Any],
        pk_column: Optional[str] = None,
    ) -> None:
        data = self._read_all()
        data.setdefault(job_id, [])
        # Evita duplicar respaldo para la misma fila/tabla si el job se reintenta.
        key = (table_name, str(record_pk))
        filtered = [item for item in data[job_id] if (item.get("table_name"), str(item.get("record_pk"))) != key]
        filtered.append({
            "job_id": job_id,
            "table_name": table_name,
            "pk_column": pk_column,
            "record_pk": str(record_pk),
            "original_data": original_data,
        })
        data[job_id] = filtered
        self._write_all(data)

    async def get_backups_for_job(self, job_id: str) -> List[Dict[str, Any]]:
        return self._read_all().get(job_id, [])

    async def delete_backups_for_job(self, job_id: str) -> None:
        data = self._read_all()
        data.pop(job_id, None)
        self._write_all(data)


class MongoVaultRepository(VaultRepository):
    def __init__(self, uri: str, database_name: str):
        self.client = AsyncIOMotorClient(uri)
        self.db = self.client[database_name]
        self.collection = self.db["vault_backups"]

    async def save_backup(
        self,
        job_id: str,
        table_name: str,
        record_pk: str,
        original_data: Dict[str, Any],
        pk_column: Optional[str] = None,
    ) -> None:
        doc = {
            "job_id": job_id,
            "table_name": table_name,
            "pk_column": pk_column,
            "record_pk": str(record_pk),
            "original_data": original_data,
        }
        await self.collection.update_one(
            {"job_id": job_id, "table_name": table_name, "record_pk": str(record_pk)},
            {"$set": doc},
            upsert=True,
        )

    async def get_backups_for_job(self, job_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"job_id": job_id})
        results = []
        async for document in cursor:
            if "_id" in document:
                del document["_id"]
            results.append(document)
        return results

    async def delete_backups_for_job(self, job_id: str) -> None:
        await self.collection.delete_many({"job_id": job_id})


memory_vault_repository = MemoryVaultRepository()
file_vault_repository = FileVaultRepository()
