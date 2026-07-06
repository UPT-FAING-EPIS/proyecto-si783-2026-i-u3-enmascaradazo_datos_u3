# Cloud URI examples for Enmask

All examples are placeholders. Never commit real credentials.

## MongoDB Atlas

```text
mongodb+srv://USER:***@cluster0.example.mongodb.net/DATABASE?retryWrites=true&w=majority&appName=Cluster0
```

Checklist: allowlist IP, correct user role, correct database name, DNS/SRV available.

## Redis Cloud

```text
rediss://default:***@redis-12345.example.cloud.redislabs.com:12345/0
```

Checklist: use `rediss://` for TLS, include ACL username when required, verify database number.

## Neo4j Aura

```text
neo4j+s://neo4j:***@abc123.databases.neo4j.io:7687/neo4j
```

Checklist: use port 7687, not 7474; use `neo4j+s://`; database usually `neo4j`.

## Cassandra / Astra style

```text
cassandra://token:***@astra/keyspace?secure_connect_bundle=C:/wallet/secure-connect-db.zip
```

Checklist: secure connect bundle path must exist where the backend runs; local datacenter/TLS settings may be required.

## Oracle Cloud / wallet style

```text
oracle://USER:***@ALIAS/service?tns_alias=mydb_high&config_dir=C:/wallet
```

Checklist: Oracle Instant Client and wallet/config directory must be available to the backend process.

## SQL Server remote

```text
mssql://USER:***@sql.example.com:1433/DATABASE?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes
```

Checklist: ODBC driver installed, TCP/IP enabled, firewall allows 1433, SQL authentication enabled, schema-qualified table names.
