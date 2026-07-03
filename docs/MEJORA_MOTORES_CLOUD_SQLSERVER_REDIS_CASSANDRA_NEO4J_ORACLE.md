# Mejora de conexiones cloud y enmascaramiento multi-motor

## Objetivo

Se reforzó Enmask para que no dependa de `localhost` y pueda trabajar mejor con motores locales, remotos y cloud:

- SQL Server
- Redis / Redis Cloud
- Cassandra / Astra o cluster remoto
- Neo4j / Neo4j Aura
- Oracle Database / Oracle Cloud

## SQL Server

### Mejora aplicada

Antes Enmask listaba o consultaba tablas por nombre simple, por ejemplo:

```sql
SELECT TOP (30) * FROM [BusinessEntity]
```

Eso falla cuando la tabla pertenece a un schema distinto de `dbo`, por ejemplo:

```sql
Person.BusinessEntity
SalesLT.Customer
HumanResources.Employee
```

Ahora Enmask trabaja con nombres completos:

```text
dbo.Clientes
Person.BusinessEntity
SalesLT.Customer
```

Y genera SQL como:

```sql
SELECT TOP (30) * FROM [Person].[BusinessEntity]
```

### Uso recomendado

En SQL Server selecciona siempre `schema.tabla`. Si el usuario escribe solo `Tabla`, Enmask intentará resolverla únicamente si existe una sola coincidencia.

## Redis

### Mejora aplicada

Redis ahora soporta mejor:

- `redis://`
- `rediss://` para Redis Cloud/TLS
- usuario ACL, por ejemplo `default`
- contraseña en URI
- timeouts de conexión
- `ssl=true` y `ssl_cert_reqs=none` en query para laboratorios
- lectura de strings, hashes, listas, sets, zsets y streams para preview

### Ejemplos

Redis local:

```text
redis://localhost:6379/0
```

Redis Cloud con TLS:

```text
rediss://default:CLAVE@redis-xxxxx.cloud.redislabs.com:12345/0
```

Para reglas de enmascaramiento:

```text
target_table = cliente:*
target_column = value      # string
```

O en hashes:

```text
target_table = cliente:*
target_column = dni
```

Nota: apply físico está soportado de forma segura sobre strings y hashes. Para list/set/zset/stream se recomienda vista virtual.

## Cassandra

### Mejora aplicada

Cassandra ahora soporta:

- host simple
- múltiples contact points separados por coma
- `local_datacenter`
- TLS/SSL
- secure connect bundle para Astra/DataStax
- primary keys compuestas para updates físicos

### Ejemplos

Cluster simple:

```text
cassandra://cassandra:cassandra@host1:9042/enmask_keyspace?local_datacenter=datacenter1
```

Múltiples nodos:

```text
cassandra://user:clave@node1,node2,node3:9042/enmask_keyspace?local_datacenter=datacenter1&ssl=true
```

Astra/DataStax con secure connect bundle:

```text
cassandra://token:token_password@astra/enmask_keyspace?secure_connect_bundle=C:/rutas/secure-connect-db.zip
```

Nota: para Astra normalmente necesitas descargar el secure connect bundle y pasar su ruta local accesible para el backend.

## Neo4j

### Mejora aplicada

Neo4j ahora soporta mejor:

- `bolt://`
- `neo4j://`
- `bolt+s://`
- `neo4j+s://` para Neo4j Aura
- timeout configurable
- labels, tipos de relación y propiedades con caracteres especiales mediante backticks seguros

### Ejemplos

Neo4j local:

```text
bolt://neo4j:clave@localhost:7687/neo4j
```

Neo4j Aura:

```text
neo4j+s://neo4j:clave@xxxx.databases.neo4j.io:7687/neo4j
```

Nota: usa el puerto Bolt `7687`, no el puerto web `7474`.

## Oracle

### Mejora aplicada

Oracle ahora soporta mejor:

- host/puerto/service name
- `oracle://`
- `oracle+tcps://`
- `service_name`
- `sid`
- wallet/config_dir para Oracle Cloud
- TNS alias
- tablas como `owner.tabla`, equivalente a `schema.tabla`

### Ejemplos

Oracle local XE:

```text
oracle://system:clave@localhost:1521/XEPDB1
```

Oracle remoto con service name:

```text
oracle://usuario:clave@host-remoto:1521/NOMBRE_SERVICIO
```

Oracle Cloud con wallet/TNS:

```text
oracle://usuario:clave@mi_alias/servicio?tns_alias=mi_alias_high&config_dir=C:/wallet
```

O usando TCPS:

```text
oracle+tcps://usuario:clave@host-cloud:1522/servicio?wallet_location=C:/wallet
```

## Nota sobre localhost

Si ejecutas backend sin Docker en tu PC:

```text
localhost = tu propia PC
```

Si ejecutas backend dentro de Docker:

```text
localhost = el contenedor
host.docker.internal = tu PC anfitriona
```

Si usas un motor cloud, debes poner el host o URI real del proveedor, como haces con MongoDB Atlas.
