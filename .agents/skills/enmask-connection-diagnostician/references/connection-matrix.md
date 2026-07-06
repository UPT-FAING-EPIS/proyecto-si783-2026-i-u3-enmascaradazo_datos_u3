# Enmask connection matrix

| Engine | Default port | Local URI/example | Cloud notes | Frequent issue |
|---|---:|---|---|---|
| SQL Server | 1433 | `mssql://user:pass@localhost:1433/db?TrustServerCertificate=yes` | Use public host/IP; ODBC Driver 18 required | missing ODBC driver, TCP/IP disabled, schema omitted |
| Oracle | 1521 | `oracle://user:pass@localhost:1521/XEPDB1` | Wallet/TNS may require `config_dir` and alias | instant client/wallet/TNS config |
| Redis | 6379 | `redis://:pass@localhost:6379/0` | Redis Cloud often uses `rediss://` TLS | TLS not enabled, wrong username, ACL auth |
| Cassandra | 9042 | `cassandra://user:pass@localhost:9042/keyspace?local_datacenter=datacenter1` | Astra uses secure connect bundle | local_datacenter missing, keyspace missing, TLS |
| Neo4j | 7687 | `bolt://neo4j:pass@localhost:7687/neo4j` | Aura usually uses `neo4j+s://...:7687` | using 7474 instead of 7687, TLS scheme wrong |
| MongoDB | 27017 | `mongodb://user:pass@localhost:27017/db` | Atlas uses `mongodb+srv://...` | IP not allowed, authSource, SRV/DNS issue |
| PostgreSQL | 5432 | `postgresql://user:pass@localhost:5432/db` | Cloud often requires SSL | SSL required, wrong database |
| MySQL/MariaDB | 3306 | `mysql://user:pass@localhost:3306/db` | Cloud may require SSL and allowlisted IP | public access/firewall/user host grants |
| SQLite | file | file path | usually local only | wrong file path or permissions |

## Object naming checks

- SQL Server: prefer `schema.table`, for example `SalesLT.Customer`.
- Oracle: prefer `owner.table` when not using the logged-in schema.
- Cassandra: prefer `keyspace.table`.
- Neo4j: labels/relationship types and properties, not tables.
