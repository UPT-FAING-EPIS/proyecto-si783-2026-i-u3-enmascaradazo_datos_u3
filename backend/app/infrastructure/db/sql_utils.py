import re
from typing import Iterable

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class UnsafeIdentifierError(ValueError):
    pass


def _identifier_parts(identifier: str) -> list[str]:
    parts = [part.strip() for part in str(identifier).split(".") if part.strip()]
    if not parts:
        raise UnsafeIdentifierError("Identificador vacio")
    for part in parts:
        if not _IDENTIFIER_RE.fullmatch(part):
            raise UnsafeIdentifierError(f"Identificador no seguro: {identifier}")
    return parts


def quote_identifier(identifier: str, quote_char: str) -> str:
    """Valida y escapa nombres de tabla/columna.

    Solo permite identificadores simples o compuestos por punto, por ejemplo:
    users, public.users, dbo.Clientes. No acepta espacios, ;, -- ni funciones.
    """
    parts = _identifier_parts(identifier)
    return ".".join(f"{quote_char}{part}{quote_char}" for part in parts)


def quote_mssql_identifier(identifier: str) -> str:
    """Cita identificadores SQL Server con corchetes: [schema].[tabla]."""
    parts = _identifier_parts(identifier)
    return ".".join("[" + part.replace("]", "]] ").replace("]] ", "]]") + "]" for part in parts)


def validate_identifiers(values: Iterable[str]) -> None:
    for value in values:
        quote_identifier(value, '"')
