from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional
from urllib.parse import parse_qsl, quote_plus, unquote_plus, urlsplit

from app.domain.value_objects.database_type import DatabaseType


SCHEME_TO_TYPE: Dict[str, DatabaseType] = {
    "postgres": DatabaseType.POSTGRES,
    "postgresql": DatabaseType.POSTGRES,
    "postgresql+asyncpg": DatabaseType.POSTGRES,
    "mysql": DatabaseType.MYSQL,
    "mysql+pymysql": DatabaseType.MYSQL,
    "mysql+aiomysql": DatabaseType.MYSQL,
    "mariadb": DatabaseType.MARIADB,
    "mariadb+pymysql": DatabaseType.MARIADB,
    "mssql": DatabaseType.SQLSERVER,
    "sqlserver": DatabaseType.SQLSERVER,
    "mssql+pyodbc": DatabaseType.SQLSERVER,
    "mssql+aioodbc": DatabaseType.SQLSERVER,
    "oracle": DatabaseType.ORACLE,
    "oracle+oracledb": DatabaseType.ORACLE,
    "oracle+tcps": DatabaseType.ORACLE,
    "cassandra": DatabaseType.CASSANDRA,
    "cql": DatabaseType.CASSANDRA,
    "mongodb": DatabaseType.MONGODB,
    "mongodb+srv": DatabaseType.MONGODB,
    "redis": DatabaseType.REDIS,
    "rediss": DatabaseType.REDIS,
    "bolt": DatabaseType.NEO4J,
    "bolt+s": DatabaseType.NEO4J,
    "bolt+ssc": DatabaseType.NEO4J,
    "neo4j": DatabaseType.NEO4J,
    "neo4j+s": DatabaseType.NEO4J,
    "neo4j+ssc": DatabaseType.NEO4J,
    "sqlite": DatabaseType.SQLITE,
    "sqlite+aiosqlite": DatabaseType.SQLITE,
}


@dataclass(frozen=True)
class ParsedConnectionUri:
    original: str
    normalized_uri: str
    scheme: str
    engine: DatabaseType
    host: str
    port: Optional[int]
    database: str
    username: str
    password: str
    query: Dict[str, str]


def looks_like_connection_uri(value: str | None) -> bool:
    raw = (value or "").strip().lower()
    return "://" in raw and raw.split("://", 1)[0] in SCHEME_TO_TYPE


def encode_credential_once(value: str | None) -> str:
    if value is None:
        return ""
    return quote_plus(unquote_plus(str(value)), safe="")


def _decode_credential(value: str | None) -> str:
    if not value:
        return ""
    return unquote_plus(value)


def _netloc_slice(rest: str) -> tuple[str, str]:
    """Return (netloc, suffix) without requiring the URI to be perfectly escaped."""
    indices = [idx for idx in (rest.find("/"), rest.find("?"), rest.find("#")) if idx >= 0]
    if not indices:
        return rest, ""
    cut = min(indices)
    return rest[:cut], rest[cut:]


def normalize_userinfo_in_uri(raw_uri: str) -> str:
    """URL-encode user/password in a pasted URI without touching the host/query.

    Users often paste Atlas/Supabase URLs with an unescaped password. PyMongo,
    SQLAlchemy and other drivers reject those URLs. We split on the last '@' in
    the authority so passwords containing '@' can still be fixed.
    """
    raw = (raw_uri or "").strip()
    if "://" not in raw:
        return raw
    scheme, rest = raw.split("://", 1)
    netloc, suffix = _netloc_slice(rest)
    if "@" not in netloc:
        return raw

    userinfo, endpoint = netloc.rsplit("@", 1)
    if ":" in userinfo:
        username, password = userinfo.split(":", 1)
        safe_userinfo = f"{encode_credential_once(username)}:{encode_credential_once(password)}"
    else:
        safe_userinfo = encode_credential_once(userinfo)
    return f"{scheme}://{safe_userinfo}@{endpoint}{suffix}"


def parse_connection_uri(raw_uri: str, expected_type: DatabaseType | None = None) -> ParsedConnectionUri:
    normalized = normalize_userinfo_in_uri(raw_uri)
    parts = urlsplit(normalized)
    scheme = parts.scheme.lower()
    if scheme not in SCHEME_TO_TYPE:
        raise ValueError(f"Esquema de conexión no soportado: {parts.scheme}")
    engine = SCHEME_TO_TYPE[scheme]
    if expected_type and engine != expected_type:
        # MariaDB can reuse MySQL protocol and vice versa.
        compatible = {DatabaseType.MYSQL, DatabaseType.MARIADB}
        if not ({engine, expected_type} <= compatible):
            raise ValueError(f"La URI pertenece a {engine.value}, pero el motor seleccionado es {expected_type.value}.")

    database = (parts.path or "").lstrip("/")
    if engine == DatabaseType.SQLITE:
        # sqlite:///C:/tmp/a.db should keep the local path.
        database = parts.path or database

    return ParsedConnectionUri(
        original=raw_uri,
        normalized_uri=normalized,
        scheme=scheme,
        engine=engine,
        host=parts.hostname or "",
        port=parts.port,
        database=database,
        username=_decode_credential(parts.username),
        password=_decode_credential(parts.password),
        query=dict(parse_qsl(parts.query, keep_blank_values=True)),
    )


def query_to_string(query: Dict[str, str] | None, *, translate_postgres_sslmode: bool = False) -> str:
    if not query:
        return ""
    clean = dict(query)
    if translate_postgres_sslmode and "sslmode" in clean and "ssl" not in clean:
        sslmode = clean.pop("sslmode")
        clean["ssl"] = "true" if sslmode in {"require", "verify-ca", "verify-full"} else sslmode
    if not clean:
        return ""
    return "?" + "&".join(f"{quote_plus(str(k))}={quote_plus(str(v))}" for k, v in clean.items())
