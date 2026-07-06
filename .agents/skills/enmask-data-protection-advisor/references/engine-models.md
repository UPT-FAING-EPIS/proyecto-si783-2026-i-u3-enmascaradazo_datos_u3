# Engine object mapping for Enmask

## Relational engines

SQL Server, PostgreSQL, MySQL, MariaDB, SQLite and Oracle use table/column-style rules. Prefer schema-qualified names when the engine supports schemas.

- SQL Server: `schema.table`; build SQL as `[schema].[table]`.
- PostgreSQL: `schema.table`; build SQL as `"schema"."table"`.
- Oracle: `owner.table`; use service name or TNS configuration for cloud.
- MySQL/MariaDB: table names usually belong to the selected database.

## MongoDB

- Object: collection.
- Field: document property path.
- Example: collection `customers`, field `profile.email`.

## Redis

- Object: key pattern such as `customer:*`.
- Field: `value` for string keys, or the hash field name for hashes.
- For list, set, zset, and stream support, explain that behavior depends on the implemented client features and should be verified with dry-run.

## Cassandra

- Object: `keyspace.table`.
- Field: column.
- Always consider partition key and clustering key before physical apply.

## Neo4j

Neo4j does not have tables or columns.

- Object: node label or relationship type.
- Field: property.
- Row equivalent: node or relationship.
- Identifier equivalent: `elementId()`.

Examples:

- `node:Cliente.dni` protects the `dni` property on nodes with label `Cliente`.
- `relationship:COMPRA.tarjeta` protects the `tarjeta` property on `COMPRA` relationships.

For Neo4j, phrase outputs as "property masking for nodes and relationships" rather than table masking.
