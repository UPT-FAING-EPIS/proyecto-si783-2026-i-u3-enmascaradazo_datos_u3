from __future__ import annotations

from typing import Any, Dict, List
from urllib.parse import quote_plus, unquote_plus

import motor.motor_asyncio


def _encode_credential(value: str | None) -> str:
    """Encode a MongoDB credential exactly once for URI usage."""
    if value is None:
        return ""
    return quote_plus(unquote_plus(str(value)))


def _split_userinfo(userinfo: str) -> tuple[str, str]:
    """Split raw userinfo safely enough for pasted Atlas URIs.

    MongoDB userinfo should be username:password. We split only on the first
    colon because usernames normally do not contain ':'; the password may.
    """
    if ":" not in userinfo:
        return userinfo, ""
    user, password = userinfo.split(":", 1)
    return user, password


def _query_string(query: Dict[str, str] | None) -> str:
    if not query:
        return ""
    return "?" + "&".join(f"{quote_plus(str(k))}={quote_plus(str(v))}" for k, v in query.items())


def build_mongo_uri(host: str, username: str = "", password: str = "", port: int | None = None, scheme: str | None = None, query: Dict[str, str] | None = None) -> str:
    """Build a MongoDB URI from either a simple host or a pasted URI.

    Accepted forms for host:
    - cluster0.xxxxx.mongodb.net
    - localhost
    - localhost:27017
    - mongodb+srv://cluster0.xxxxx.mongodb.net
    - mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
    - mongodb://user:password@localhost:27017

    If credentials are already present in the pasted URI, they are preserved
    and URL-encoded automatically. If they are absent, Enmask injects the
    username/password fields entered in the form.
    """
    raw = (host or "").strip()
    user = _encode_credential(username)
    pwd = _encode_credential(password)

    if not raw:
        raise ValueError("MongoDB requiere host o URI de conexión.")

    if raw.startswith(("mongodb+srv://", "mongodb://")):
        scheme, remainder = raw.split("://", 1)

        # Preserve query string/path/options, but normalize credentials.
        if "@" in remainder:
            raw_userinfo, endpoint = remainder.rsplit("@", 1)
            uri_user, uri_pwd = _split_userinfo(raw_userinfo)
            enc_user = _encode_credential(uri_user)
            enc_pwd = _encode_credential(uri_pwd)
            if enc_user and enc_pwd:
                return f"{scheme}://{enc_user}:{enc_pwd}@{endpoint}"
            if enc_user:
                return f"{scheme}://{enc_user}@{endpoint}"
            return f"{scheme}://{endpoint}"

        if user and pwd:
            return f"{scheme}://{user}:{pwd}@{remainder}"
        if user:
            return f"{scheme}://{user}@{remainder}"
        return f"{scheme}://{remainder}"

    selected_scheme = scheme if scheme in {"mongodb", "mongodb+srv"} else None
    # Simple Atlas host. Use SRV by default unless the pasted URI explicitly used mongodb://.
    if raw.endswith(".mongodb.net") or ".mongodb.net/" in raw:
        prefix = selected_scheme or "mongodb+srv"
        suffix = _query_string(query)
        return f"{prefix}://{user}:{pwd}@{raw}{suffix}" if user or pwd else f"{prefix}://{raw}{suffix}"

    # Simple local/remote host.
    prefix = selected_scheme or "mongodb"
    endpoint = raw if ":" in raw else f"{raw}:{port}" if port else raw
    suffix = _query_string(query)
    if user or pwd:
        return f"{prefix}://{user}:{pwd}@{endpoint}{suffix}"
    return f"{prefix}://{endpoint}{suffix}"


class MongoClient:
    def __init__(self, uri: str, database: str):
        self.client = motor.motor_asyncio.AsyncIOMotorClient(uri)
        self.db = self.client[database]

    async def test_connection(self) -> None:
        await self.client.admin.command("ping")

    async def fetch_all(self, collection_name: str, query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        query = query or {}
        collection = self.db[collection_name]
        cursor = collection.find(query)
        records = await cursor.to_list(length=None)
        for r in records:
            if "_id" in r:
                r["_id"] = str(r["_id"])
        return records

    async def update_record(self, collection_name: str, record_id: Any, updates: Dict[str, Any]):
        from bson import ObjectId

        collection = self.db[collection_name]
        try:
            query_id = ObjectId(record_id) if isinstance(record_id, str) and len(record_id) == 24 else record_id
        except Exception:
            query_id = record_id
        await collection.update_one({"_id": query_id}, {"$set": updates})

    async def create_view(self, view_name: str, source_collection: str, pipeline: List[Dict[str, Any]]) -> None:
        collections = await self.db.list_collection_names()
        if view_name in collections:
            await self.db[view_name].drop()
        await self.db.create_collection(view_name, viewOn=source_collection, pipeline=pipeline)

    async def drop_view(self, view_name: str) -> None:
        collections = await self.db.list_collection_names()
        if view_name in collections:
            await self.db[view_name].drop()

    async def unset_field(self, collection_name: str, field_name: str) -> None:
        collection = self.db[collection_name]
        await collection.update_many({}, {"$unset": {field_name: ""}})

    async def get_schema(self) -> Dict[str, List[str]]:
        collections = await self.db.list_collection_names()
        schema = {}
        for coll_name in collections:
            collection = self.db[coll_name]
            doc = await collection.find_one({})
            if doc:
                keys = [k for k in doc.keys() if k != "_id"]
                schema[coll_name] = keys
            else:
                schema[coll_name] = []
        return schema
