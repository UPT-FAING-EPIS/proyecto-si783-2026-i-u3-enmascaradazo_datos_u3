from __future__ import annotations

from typing import Any, Dict, List, Optional


def _truthy(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "si", "sí", "require"}


def _float_option(value: Any, default: Optional[float]) -> Optional[float]:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class RedisClient:
    """Cliente Redis compatible con Redis local, Redis Cloud y rediss://.

    target_table se interpreta como patron de clave (por ejemplo cliente:*).
    target_column puede ser:
    - value: para strings Redis.
    - nombre de campo: para hashes Redis.

    Para Redis Cloud/TLS se puede pegar una URI rediss://... en Host o usar
    host separado con additional_options/URI query ssl=true.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        db_index: int,
        *,
        scheme: str | None = None,
        options: Dict[str, Any] | None = None,
    ):
        import redis.asyncio as redis

        options = options or {}
        uri_query = options.get("uri_query") or {}
        scheme = (scheme or options.get("source_uri_scheme") or "redis").lower()
        use_ssl = scheme == "rediss" or _truthy(options.get("ssl") or uri_query.get("ssl") or uri_query.get("tls"))

        ssl_cert_reqs = options.get("ssl_cert_reqs") or uri_query.get("ssl_cert_reqs")
        if use_ssl and not ssl_cert_reqs:
            # Redis Cloud suele usar certificados publicos validos. Se mantiene
            # validacion por defecto. Para laboratorios con cert self-signed, el
            # usuario puede pasar ssl_cert_reqs=none en la URI.
            ssl_cert_reqs = "required"
        if str(ssl_cert_reqs).lower() in {"none", "false", "0", "no"}:
            ssl_cert_reqs = None

        self.client = redis.Redis(
            host=host,
            port=port or 6379,
            username=username or None,
            password=password or None,
            db=int(db_index or 0),
            decode_responses=True,
            ssl=use_ssl,
            ssl_cert_reqs=ssl_cert_reqs,
            socket_timeout=_float_option(options.get("socket_timeout") or uri_query.get("socket_timeout"), 10.0),
            socket_connect_timeout=_float_option(options.get("socket_connect_timeout") or uri_query.get("socket_connect_timeout"), 10.0),
            health_check_interval=int(options.get("health_check_interval") or uri_query.get("health_check_interval") or 30),
        )

    async def test_connection(self) -> None:
        await self.client.ping()

    async def _scan_keys(self, pattern: str, count: int = 200) -> List[str]:
        keys: List[str] = []
        async for key in self.client.scan_iter(match=pattern or "*", count=count):
            keys.append(key)
            if len(keys) >= count:
                break
        return keys

    async def _record_for_key(self, key: str) -> Dict[str, Any] | None:
        key_type = await self.client.type(key)
        if key_type == "hash":
            data = await self.client.hgetall(key)
            data["_id"] = key
            data["_redis_type"] = key_type
            return data
        if key_type == "string":
            return {"_id": key, "_redis_type": key_type, "value": await self.client.get(key)}
        if key_type == "list":
            return {"_id": key, "_redis_type": key_type, "value": await self.client.lrange(key, 0, 49)}
        if key_type == "set":
            return {"_id": key, "_redis_type": key_type, "value": sorted(list(await self.client.smembers(key)))[:50]}
        if key_type == "zset":
            return {"_id": key, "_redis_type": key_type, "value": await self.client.zrange(key, 0, 49, withscores=True)}
        if key_type == "stream":
            return {"_id": key, "_redis_type": key_type, "value": await self.client.xrange(key, count=50)}
        return {"_id": key, "_redis_type": key_type, "value": str(key_type)}

    async def get_schema(self) -> Dict[str, List[str]]:
        schema: Dict[str, List[str]] = {}
        for key in await self._scan_keys("*", count=500):
            key_type = await self.client.type(key)
            if key_type == "hash":
                fields = list((await self.client.hkeys(key)) or [])
                schema[key] = fields + ["_redis_type"]
            else:
                schema[key] = ["value", "_redis_type"]
        return schema

    async def fetch_all(self, pattern: str, query: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
        for key in await self._scan_keys(pattern or "*", count=500):
            record = await self._record_for_key(key)
            if record is not None:
                records.append(record)
        return records

    async def update_record(self, collection_name: str, record_id: Any, updates: Dict[str, Any]):
        key = str(record_id)
        key_type = await self.client.type(key)
        if key_type == "string" or list(updates.keys()) == ["value"]:
            if key_type not in {"string", "none"}:
                raise ValueError(
                    f"Redis key '{key}' es de tipo {key_type}. Solo se puede aplicar mascara fisica directa sobre string o hash."
                )
            await self.client.set(key, updates.get("value"))
        elif key_type == "hash":
            clean = {k: "" if v is None else str(v) for k, v in updates.items() if not str(k).startswith("_")}
            if clean:
                await self.client.hset(key, mapping=clean)
        else:
            raise ValueError(
                f"Redis key '{key}' es de tipo {key_type}. Para list/set/zset/stream usa vista virtual o convierte el dato a string/hash."
            )

    async def create_view(self, view_name: str, source_collection: str, pipeline: List[Dict[str, Any]]) -> None:
        # Redis no tiene vistas nativas. Enmask registra el artefacto como vista virtual.
        return None

    async def drop_view(self, view_name: str) -> None:
        return None

    async def unset_field(self, collection_name: str, field_name: str) -> None:
        for record in await self.fetch_all(collection_name):
            key = record.get("_id")
            if not key:
                continue
            key_type = await self.client.type(key)
            if key_type == "hash":
                await self.client.hdel(key, field_name)
            elif key_type == "string" and field_name == "value":
                await self.client.delete(key)
