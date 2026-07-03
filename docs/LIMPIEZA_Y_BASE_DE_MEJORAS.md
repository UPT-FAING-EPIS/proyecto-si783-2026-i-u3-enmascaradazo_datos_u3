# Limpieza general y base para mejoras — Enmask

## Objetivo

Dejar el proyecto en una base más prolija para continuar con dos líneas de mejora:

1. Agregar más motores de bases de datos relacionales y no relacionales.
2. Cambiar el flujo de enmascaramiento para que sea más seguro y demostrable.

## Cambios de limpieza realizados

- Se creó un `.gitignore` real en la raíz del proyecto.
- Se eliminaron archivos de entorno reales (`backend/.env`, `frontend/.env`).
- Se eliminaron pruebas sueltas con credenciales reales (`backend/test_mongo.py`, `backend/test_settings.py`).
- Se eliminaron artefactos generados como `__pycache__` y `.pytest_cache`.
- Se eliminaron archivos `package.json` y `package-lock.json` de la raíz porque el proyecto Node real está en `frontend/`.
- Se corrigió el `backend/Dockerfile` para usar `${PORT:-8000}`.
- Se limpió `frontend/.env.example` para no dejar un client id real por defecto.

## Seguridad corregida

### 1. Password de conexión

Antes, `ConnectionResponse` heredaba de `ConnectionCreate`, por lo que el password podía volver al frontend.

Ahora:

- `ConnectionCreate` recibe password.
- `ConnectionResponse` no devuelve password.

Archivo principal:

```text
backend/app/application/schemas.py
```

### 2. Roles

Se agregó campo `role` en `User`.

Los administradores se definen desde:

```text
ADMIN_EMAILS=correo1@dominio.com,correo2@dominio.com
```

Archivos principales:

```text
backend/app/domain/entities/user.py
backend/app/application/services/auth_service.py
backend/app/api/deps.py
```

### 3. Endpoint de usuarios

`GET /auth/users` ahora requiere rol `admin`.

### 4. Query compartida

Los usuarios compartidos ya no pueden pedir datos originales con `mask=false`.

Regla actual:

```text
owner       → puede ver original o enmascarado
shared user → siempre ve enmascarado
```

Archivo principal:

```text
backend/app/application/services/job_orchestrator.py
```

### 5. SQL seguro

Se agregó validación y escape de identificadores para tabla y columna.

Archivos principales:

```text
backend/app/infrastructure/db/sql_utils.py
backend/app/infrastructure/db/sqlalchemy_client.py
```

## Motores agregados o preparados

| Motor | Estado | Archivo |
|------|--------|---------|
| PostgreSQL | Existente, refactorizado | `postgres_client.py` |
| MySQL | Existente, refactorizado | `mysql_client.py` |
| MariaDB | Alias compatible con MySQL | `factory.py` |
| SQLite | Agregado para pruebas locales | `sqlite_client.py` |
| SQL Server | Integrado | `sqlserver_client.py` |
| Oracle Database | Integrado | `oracle_client.py` |
| Apache Cassandra | Integrado | `cassandra_client.py` |
| MongoDB | Existente | `mongodb_client.py` |
| Redis | Integrado | `redis_client.py` |
| Neo4j | Integrado | `neo4j_client.py` |

El punto central para agregar motores queda en:

```text
backend/app/infrastructure/db/factory.py
```

## Cambio en el flujo de enmascaramiento

Antes el job actualizaba directamente los datos de la base destino.

Ahora el job tiene `run_mode`:

| Modo | Descripción |
|------|-------------|
| `dry_run` | Calcula la máscara y genera muestra sin modificar la base. |
| `apply` | Aplica el enmascaramiento estático sobre la base destino. |

Campos nuevos del job:

```text
run_mode
records_previewed
records_processed
affected_tables
preview_sample
```

Endpoint nuevo:

```text
GET /api/v1/jobs/{job_id}/preview?limit=20
```

## Archivos principales modificados

```text
backend/app/application/schemas.py
backend/app/application/services/auth_service.py
backend/app/application/services/connection_service.py
backend/app/application/services/job_orchestrator.py
backend/app/api/deps.py
backend/app/api/routers/auth.py
backend/app/api/routers/connections.py
backend/app/api/routers/jobs.py
backend/app/domain/entities/masking_job.py
backend/app/domain/entities/user.py
backend/app/domain/value_objects/database_type.py
backend/app/domain/value_objects/masking_run_mode.py
backend/app/infrastructure/db/factory.py
backend/app/infrastructure/db/sql_utils.py
backend/app/infrastructure/db/sqlalchemy_client.py
backend/app/infrastructure/db/sqlite_client.py
backend/app/infrastructure/db/postgres_client.py
backend/app/infrastructure/db/mysql_client.py
backend/app/infrastructure/repositories/vault_repo.py
frontend/src/types/index.ts
frontend/src/pages/Connections.tsx
frontend/src/pages/Jobs.tsx
frontend/src/services/api.ts
README.md
```

## Validación realizada

Se ejecutó:

```text
cd backend
PYTHONPATH=. pytest -q
```

Resultado:

```text
3 passed
```

## Pendientes recomendados

1. Cifrar passwords de conexiones antes de persistirlos.
2. Cifrar `original_data` del vault.
3. Agregar SQL Server usando un cliente separado y driver ODBC documentado.
4. Agregar Redis con reglas adaptadas a key/value y hashes.
5. Agregar Cassandra o Neo4j solo si se define claramente qué significa tabla/campo en cada modelo.
6. Agregar pruebas unitarias para jobs `dry_run`, `apply`, `query_data` y permisos de usuarios compartidos.
7. Traducir todo el frontend a español si el informe final será académico en español.
