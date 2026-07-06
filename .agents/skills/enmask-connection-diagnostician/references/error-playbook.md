# Connection error playbook

## SQL Server

- `IM002 Data source name not found`: ODBC driver missing or driver name mismatch. Install Microsoft ODBC Driver 18 and verify `pyodbc.drivers()`.
- `Invalid object name`: table exists under a schema. Use `schema.table`, for example `Person.BusinessEntity`.
- `Login failed for user`: SQL authentication or password/permissions issue.
- Timeout/connection refused: host, port, TCP/IP, firewall, or instance configuration.

## Redis

- `WRONGPASS` or auth error: username/password mismatch or ACL user missing.
- SSL/TLS error: cloud endpoint likely requires `rediss://` and SSL enabled.
- Connection refused: wrong host/port or cloud firewall.

## Cassandra

- `NoHostAvailable`: host, port, local datacenter, TLS, or credentials issue.
- `Keyspace does not exist`: database/keyspace field is wrong or has not been created.
- Apply updates fail: partition/clustering key incomplete.

## Neo4j

- Service unavailable: wrong scheme, host, or port. Use 7687 for Bolt.
- Authentication failed: user/password issue.
- TLS/routing issue on Aura: use `neo4j+s://` instead of `bolt://`.
- Property not shown: selected label or relationship type may not contain that property.

## Oracle

- `DPI-1047`: Oracle client library missing or not in PATH.
- TNS/wallet error: config directory or alias invalid.
- Invalid username/password: credentials or service name wrong.
- Table not found: use owner-qualified object name.
