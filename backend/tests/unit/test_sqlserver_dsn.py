from urllib.parse import parse_qs, unquote_plus, urlsplit

from app.infrastructure.db.sqlserver_client import build_sqlserver_dsn


def _odbc_connect(url: str) -> str:
    qs = parse_qs(urlsplit(url).query)
    return unquote_plus(qs["odbc_connect"][0])


def test_sqlserver_dsn_uses_odbc_server_comma_port():
    url = build_sqlserver_dsn("sa", "P@ss:123", "host.docker.internal", 1433, "Clientes")
    odbc = _odbc_connect(url)
    assert "DRIVER={ODBC Driver 18 for SQL Server}" in odbc
    assert "SERVER=host.docker.internal,1433" in odbc
    assert "DATABASE=Clientes" in odbc
    assert "UID=sa" in odbc
    assert "PWD=P@ss:123" in odbc
    assert "TrustServerCertificate=yes" in odbc


def test_sqlserver_dsn_keeps_named_instance_without_forcing_port():
    url = build_sqlserver_dsn("sa", "secret", r"DESKTOP\SQLEXPRESS", 1433, "Demo")
    odbc = _odbc_connect(url)
    assert r"SERVER=DESKTOP\SQLEXPRESS" in odbc
    assert r"SERVER=DESKTOP\SQLEXPRESS,1433" not in odbc
