# Plan Senior - Conexiones flexibles por URI y campos separados

## Objetivo
Permitir que Enmask conecte motores relacionales y no relacionales usando dos estilos de captura:

1. **Campos separados**: host, puerto, base de datos, usuario y contraseña.
2. **URI completa**: `postgresql://...`, `mysql://...`, `mongodb+srv://...`, `redis://...`, `bolt://...`, etc.

Esto reduce errores porque muchos proveedores cloud, como Supabase, MongoDB Atlas, Neo4j Aura o Redis Cloud, entregan una URI lista para copiar.

## Cambios aplicados

### Backend
- Se agregó `backend/app/infrastructure/db/connection_uri.py`.
- Se normalizan URIs antes de crear la conexión.
- Se extraen host, puerto, base, usuario y contraseña desde la URI.
- Se evita exponer credenciales en `host` cuando la API devuelve conexiones.
- Se codifican credenciales con `quote_plus` para soportar caracteres especiales.
- Se preservan opciones de query como `sslmode=require`, `driver=...`, `retryWrites=true`, etc.

### Frontend
- El campo ahora funciona como **URI de conexión o Host** para todos los motores.
- Si el usuario pega una URI completa, usuario/contraseña/base ya no son obligatorios visualmente.
- Se agregaron placeholders por motor.
- Se agregó ayuda contextual para Supabase, MongoDB Atlas, SQL Server, Redis, Neo4j y otros.

## Motores cubiertos

| Motor | URI aceptada | Campos separados |
|---|---|---|
| PostgreSQL / Supabase | Sí | Sí |
| MySQL | Sí | Sí |
| MariaDB | Sí | Sí |
| SQL Server | Sí | Sí |
| Oracle | Sí | Sí |
| Cassandra | Sí | Sí |
| MongoDB / Atlas | Sí | Sí |
| Redis | Sí | Sí |
| Neo4j / Aura | Sí | Sí |
| SQLite | Ruta local | Sí |

## Ejemplos

### Supabase / PostgreSQL
```text
postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres?sslmode=require
```

### Supabase pooler de transacción
```text
postgres://postgres.xxxxxxxxxxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
```

### MongoDB Atlas
```text
mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net/enmask_db?retryWrites=true&w=majority
```

### SQL Server
```text
mssql://usuario:clave@localhost:1433/AdventureWorks2019?driver=ODBC+Driver+18+for+SQL+Server
```

### Redis
```text
redis://:clave@localhost:6379/0
```

### Neo4j Aura
```text
neo4j+s://neo4j:clave@xxxx.databases.neo4j.io:7687/neo4j
```

## Validaciones
- El host devuelto al frontend queda saneado, sin usuario ni contraseña.
- Si la URI no corresponde al motor seleccionado, Enmask la rechaza.
- MySQL y MariaDB se consideran compatibles porque comparten protocolo.
- `Dry-run` no modifica la base.
- `Apply` sí modifica la base si el tipo de protección lo requiere.
