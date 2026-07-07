# FD04-D — DICCIONARIO DE DATOS (ENMASK V2.0)

## UNIVERSIDAD PRIVADA DE TACNA
### FACULTAD DE INGENIERÍA
#### Escuela Profesional de Ingeniería de Sistemas

---

## CONTROL DE VERSIONES

| Versión | Hecha por | Revisada por | Aprobada por | Fecha | Motivo |
|---|---|---|---|---|---|
| 1.0 | Antigravity AI | USER | — | Julio 2026 | Creación inicial del Diccionario de Datos exhaustivo (Markdown y DOCX) |

---

## 1. INTRODUCCIÓN

Este documento presenta el **Diccionario de Datos** oficial de **Enmask v2.0**, una plataforma unificada para la protección y enmascaramiento de datos en entornos no productivos. 

El diccionario detalla el almacenamiento de metadatos internos del sistema (utilizado por el backend de FastAPI para registrar usuarios, conexiones, reglas de protección, historial de ejecuciones y auditorías) y describe el esquema de la base de datos de pruebas que sirve como entorno de demostración relacional.

### Arquitectura de Persistencia de Metadatos
Enmask v2.0 posee una arquitectura modular desacoplada mediante patrones de repositorio. Esto le permite persistir su base de datos de metadatos interna en dos motores alternativos configurables a través de la variable de entorno `REPOSITORY_BACKEND`:
1. **PostgreSQL** (base de datos relacional robusta que emplea el esquema `enmask_meta` y tablas estructuradas).
2. **MongoDB** (base de datos no relacional basada en documentos JSON que almacena registros en colecciones dentro de la base de datos `enmask_meta`).

A continuación, se describen los esquemas lógicos unificados detallando la representación tanto para sistemas relacionales (SQL) como no relacionales (BSON/NoSQL).

---

## 2. DIAGRAMA DE ENTIDAD-RELACIÓN LÓGICO

La base de datos de metadatos se estructura en torno a cinco entidades principales vinculadas al ciclo de vida del enmascaramiento. Los detalles de las relaciones lógicas se representan en el archivo fuente de diagramas [fd04_modelo_er.puml](file:///c:/Users/ACER/Downloads/FINAL%20FINAL%20FINAL/proyecto-si783-2026-i-u3-enmascaradazo_datos_u3/docs/diagrams/fd04_modelo_er.puml).

```
  +--------------+            +--------------------+            +-------------------+
  |     User     | 1      *  |     Connection     | 1      *  |    MaskingRule    |
  | (enmask_users) +----------+ (enmask_connections) +----------+ (enmask_rules)     |
  +-------+------+            +---------+----------+            +-------------------+
          | 1                           | 1
          |                             |
          | *                           | *
  +-------+------+            +---------+----------+            +-------------------+
  |   AuditLog   |            |     MaskingJob     | 1      *  |    VaultBackup    |
  | (audit_logs) |            |     (enmask_jobs)  +----------+  (vault_backups)  |
  +--------------+            +--------------------+            +-------------------+
```

---

## 3. DICCIONARIO DE DATOS DETALLADO (METADATOS INTERNOS)

Las entidades lógicas del sistema mapean a los modelos de dominio de Python ubicados en el subdirectorio de entidades: `backend/app/domain/entities/`.

### 3.1. Entidad: `User` (Usuarios)
* **Archivo de dominio**: [user.py](file:///c:/Users/ACER/Downloads/FINAL%20FINAL%20FINAL/proyecto-si783-2026-i-u3-enmascaradazo_datos_u3/backend/app/domain/entities/user.py)
* **Tabla física (SQL)**: `enmask_users`
* **Colección física (NoSQL)**: `users`
* **Descripción**: Almacena las cuentas de usuario y credenciales administrativas de la plataforma Enmask para gestionar la autenticación y el control de accesos basado en roles (RBAC).

#### Estructura de Campos

| Campo | Tipo SQL | Tipo BSON | Nulo | Clave | Valor por Defecto | Descripción | Ejemplo |
|---|---|---|---|---|---|---|---|
| `id` | `VARCHAR(36)` | `String` | No | PK | *(Autogenerado UUID v4)* | Identificador único del usuario en formato UUID string. | `"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"` |
| `email` | `VARCHAR(255)` | `String` | No | - | - | Correo electrónico del usuario (clave única de login). | `"admin@enmask.com"` |
| `name` | `VARCHAR(255)` | `String` | No | - | - | Nombre completo del usuario. | `"Juan Pérez Gómez"` |
| `picture` | `TEXT` | `String` | Sí | - | `NULL` | Enlace URL opcional a la imagen de perfil del usuario (OAuth). | `"https://lh3.googleusercontent.com/a/AATXAJ..."` |
| `role` | `VARCHAR(50)` | `String` | No | - | `"user"` | Rol del usuario en el sistema. Valores válidos: `admin`, `user`. | `"admin"` |
| `password_hash` | `VARCHAR(255)` | `String` | Sí | - | `NULL` | Contraseña cifrada con algoritmo Bcrypt (nulo si usa Google Auth). | `"$2b$12$KjW6z9lF..."` |

* **Restricciones y Reglas de Integridad**:
  * `email`: Debe ser único a nivel global. Debe cumplir con formato estándar de correo electrónico.
  * `role`: Restringido mediante check o validación a `"admin"` o `"user"`.

---

### 3.2. Entidad: `Connection` (Configuración de Conexiones)
* **Archivo de dominio**: [connection.py](file:///c:/Users/ACER/Downloads/FINAL%20FINAL%20FINAL/proyecto-si783-2026-i-u3-enmascaradazo_datos_u3/backend/app/domain/entities/connection.py)
* **Tabla física (SQL)**: `enmask_connections`
* **Colección física (NoSQL)**: `connections`
* **Descripción**: Almacena las cadenas de conexión y credenciales cifradas para enmascarar bases de datos externas en los 9 motores soportados.

#### Estructura de Campos

| Campo | Tipo SQL | Tipo BSON | Nulo | Clave | Valor por Defecto | Descripción | Ejemplo |
|---|---|---|---|---|---|---|---|
| `id` | `VARCHAR(36)` | `String` | No | PK | *(Autogenerado UUID v4)* | Identificador único del registro de conexión. | `"520bd7bf-8f55-46aa-bd1a-074900c3b0df"` |
| `name` | `VARCHAR(255)` | `String` | No | - | - | Nombre descriptivo de la conexión asignado por el usuario. | `"Servidor Pruebas Supabase"` |
| `type` | `VARCHAR(50)` | `String` | No | - | - | Motor de base de datos objetivo. Valores enum: `postgresql`, `mysql`, `sqlserver`, `oracle`, `mongodb`, `redis`, `cassandra`, `neo4j`, `sqlite`. | `"postgresql"` |
| `host` | `VARCHAR(255)` | `String` | No | - | - | Host o dirección IP del servidor destino. | `"db.supabase.co"` |
| `port` | `INTEGER` | `Int32` | No | - | - | Puerto TCP de escucha del servidor destino. | `5432` |
| `database` | `VARCHAR(255)` | `String` | No | - | - | Nombre de la base de datos o identificador de esquema. | `"postgres"` |
| `username` | `VARCHAR(255)` | `String` | No | - | - | Nombre de usuario para la autenticación externa. | `"postgres"` |
| `password` | `TEXT` | `String` | No | - | - | Contraseña de conexión externa. Almacenada mediante cifrado simétrico AES-256 (Fernet). | `"gAAAAABmB..."` |
| `additional_options` | `TEXT` | `Object` | Sí | - | `NULL` | Opciones adicionales de conexión en formato JSON string (SQL) u Objeto (BSON). | `{"ssl": "require", "schema": "public"}` |
| `owner_id` | `VARCHAR(36)` | `String` | Sí | FK | `NULL` | Referencia al creador de la conexión (`enmask_users.id`). | `"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"` |

* **Restricciones y Reglas de Integridad**:
  * `owner_id`: Clave foránea que referencia a `enmask_users(id)` con eliminación en cascada (`ON DELETE SET NULL`).
  * `port`: Debe ser un número entero positivo mayor a cero y menor o igual a 65535.

---

### 3.3. Entidad: `MaskingRule` (Reglas de Enmascaramiento)
* **Archivo de dominio**: [masking_rule.py](file:///c:/Users/ACER/Downloads/FINAL%20FINAL%20FINAL/proyecto-si783-2026-i-u3-enmascaradazo_datos_u3/backend/app/domain/entities/masking_rule.py)
* **Tabla física (SQL)**: `enmask_rules`
* **Colección física (NoSQL)**: `masking_rules`
* **Descripción**: Define la regla y estrategia de ofuscación por columna que se aplicará en una tabla o colección específica.

#### Estructura de Campos

| Campo | Tipo SQL | Tipo BSON | Nulo | Clave | Valor por Defecto | Descripción | Ejemplo |
|---|---|---|---|---|---|---|---|
| `id` | `VARCHAR(36)` | `String` | No | PK | *(Autogenerado UUID v4)* | Identificador único de la regla de enmascaramiento. | `"ab983bc1-cd62-42bb-92bc-f7b594b2ab72"` |
| `name` | `VARCHAR(255)` | `String` | No | - | - | Nombre identificativo de la regla asignado por el usuario. | `"Ofuscar Nombres Clientes"` |
| `connection_id` | `VARCHAR(36)` | `String` | No | FK | - | Conexión externa sobre la que se aplica la regla (`enmask_connections.id`). | `"520bd7bf-8f55-46aa-bd1a-074900c3b0df"` |
| `target_table` | `VARCHAR(255)` | `String` | No | - | - | Tabla, colección o keyspace objetivo. | `"public.enmask_test_customers"` |
| `target_column` | `VARCHAR(255)` | `String` | No | - | - | Columna, campo o propiedad a enmascarar. | `"full_name"` |
| `strategy` | `VARCHAR(50)` | `String` | No | - | - | Algoritmo de enmascaramiento. Valores enum: `substitution`, `hashing`, `redaction`, `nullification`, `fpe`, `perturbation`, `symmetric_encryption`. | `"substitution"` |
| `strategy_options` | `TEXT` | `Object` | Sí | - | `NULL` | Opciones JSON con la configuración de la estrategia (proveedores Faker, etc.). | `{"provider": "name", "locale": "es_MX"}` |
| `protection_mode` | `VARCHAR(50)` | `String` | No | - | `"masked_view"` | Modo de protección de datos. Valores enum: `virtual_view`, `masked_view`, `masked_column`, `static_mask`, `symmetric_encryption`. | `"static_mask"` |
| `output_column` | `VARCHAR(255)` | `String` | Sí | - | `NULL` | Nombre de la columna generada en modo `masked_column`. | `"full_name_masked"` |
| `view_name` | `VARCHAR(255)` | `String` | Sí | - | `NULL` | Nombre de la vista creada en modo `masked_view`. | `"v_enmask_customers"` |
| `key_alias` | `VARCHAR(255)` | `String` | Sí | - | `NULL` | Identificador de clave de encriptación (si aplica). | `"key_test_db"` |
| `graph_element` | `VARCHAR(50)` | `String` | Sí | - | `NULL` | Propiedad de grafo Neo4j (si aplica). Valores: `node`, `relationship`. | `NULL` |
| `owner_id` | `VARCHAR(36)` | `String` | Sí | FK | `NULL` | Referencia al usuario creador de la regla (`enmask_users.id`). | `"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"` |

* **Restricciones y Reglas de Integridad**:
  * `connection_id`: Clave foránea que referencia a `enmask_connections(id)` con eliminación en cascada (`ON DELETE CASCADE`).
  * `owner_id`: Clave foránea que referencia a `enmask_users(id)` con eliminación en cascada (`ON DELETE SET NULL`).

---

### 3.4. Entidad: `MaskingJob` (Historial de Trabajos)
* **Archivo de dominio**: [masking_job.py](file:///c:/Users/ACER/Downloads/FINAL%20FINAL%20FINAL/proyecto-si783-2026-i-u3-enmascaradazo_datos_u3/backend/app/domain/entities/masking_job.py)
* **Tabla física (SQL)**: `enmask_jobs`
* **Colección física (NoSQL)**: `jobs`
* **Descripción**: Historial de orquestación de tareas de enmascaramiento con estadísticas de procesamiento, muestras de datos y telemetría de rendimiento.

#### Estructura de Campos

| Campo | Tipo SQL | Tipo BSON | Nulo | Clave | Valor por Defecto | Descripción | Ejemplo |
|---|---|---|---|---|---|---|---|
| `id` | `VARCHAR(36)` | `String` | No | PK | *(Autogenerado UUID v4)* | Identificador único del job. | `"3c85a2fa-13f5-4d0d-9ae4-b8a7be7c7a52"` |
| `connection_id` | `VARCHAR(36)` | `String` | No | FK | - | Conexión sobre la que se ejecutó el job (`enmask_connections.id`). | `"520bd7bf-8f55-46aa-bd1a-074900c3b0df"` |
| `rule_ids` | `TEXT` | `Array[String]` | No | - | - | Lista de IDs de reglas de enmascaramiento aplicadas (almacenado como JSON array o Array). | `["ab983bc1-cd62-42bb-92bc-f7b594b2ab72"]` |
| `run_mode` | `VARCHAR(50)` | `String` | No | - | `"dry_run"` | Modo de ejecución del job. Valores enum: `dry_run`, `apply`. | `"apply"` |
| `status` | `VARCHAR(50)` | `String` | No | - | `"pending"` | Estado del trabajo. Valores enum: `pending`, `running`, `completed`, `failed`, `unmasked`. | `"completed"` |
| `started_at` | `TIMESTAMP` | `Date` | Sí | - | `NULL` | Fecha y hora en la que se inició la ejecución. | `"2026-07-07 10:15:30.000"` |
| `completed_at` | `TIMESTAMP` | `Date` | Sí | - | `NULL` | Fecha y hora en la que finalizó la ejecución. | `"2026-07-07 10:15:34.210"` |
| `error_message` | `TEXT` | `String` | Sí | - | `NULL` | Mensaje de excepción detallado en caso de fallo (`failed`). | `NULL` |
| `records_processed` | `INTEGER` | `Int32` | No | - | `0` | Cantidad de registros reales sobrescritos o transformados en base de datos. | `4` |
| `records_previewed` | `INTEGER` | `Int32` | No | - | `0` | Cantidad de registros previsualizados en memoria. | `4` |
| `affected_tables` | `TEXT` | `Array[String]` | No | - | `[]` | Lista de tablas afectadas (JSON array en SQL, Array de Strings en NoSQL). | `["public.enmask_test_customers"]` |
| `preview_sample` | `TEXT` | `Array[Object]` | No | - | `[]` | Muestra de previsualización JSON de registros originales vs. modificados. | `[{"row": 1, "original": "Ana", "masked": "Fabiola"}]` |
| `generated_artifacts` | `TEXT` | `Array[Object]` | No | - | `[]` | Detalle técnico de objetos creados en la base de datos de destino. | `[{"type": "backup", "count": 4}]` |
| `owner_id` | `VARCHAR(36)` | `String` | Sí | FK | `NULL` | ID del usuario ejecutor del job (`enmask_users.id`). | `"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"` |
| `shared_with` | `TEXT` | `Array[String]` | No | - | `[]` | Lista de IDs de usuarios compartidos (JSON array o Array). | `[]` |

* **Restricciones y Reglas de Integridad**:
  * `connection_id`: Clave foránea que referencia a `enmask_connections(id)` con eliminación restringida.
  * `owner_id`: Clave foránea que referencia a `enmask_users(id)` con eliminación en cascada (`ON DELETE SET NULL`).

---

### 3.5. Entidad: `AuditLog` (Bitácora de Auditoría)
* **Archivo de dominio**: [audit_log.py](file:///c:/Users/ACER/Downloads/FINAL%20FINAL%20FINAL/proyecto-si783-2026-i-u3-enmascaradazo_datos_u3/backend/app/domain/entities/audit_log.py)
* **Tabla física (SQL)**: `enmask_audit_logs`
* **Colección física (NoSQL)**: `audit_logs`
* **Descripción**: Bitácora histórica imborrable de consultas y operaciones de enmascaramiento con fines normativos.

#### Estructura de Campos

| Campo | Tipo SQL | Tipo BSON | Nulo | Clave | Valor por Defecto | Descripción | Ejemplo |
|---|---|---|---|---|---|---|---|
| `id` | `VARCHAR(36)` | `String` | No | PK | *(Autogenerado UUID v4)* | Identificador único del log de auditoría. | `"e42c2db4-c92c-47bc-ad3b-1b0797abdf45"` |
| `job_id` | `VARCHAR(36)` | `String` | No | FK | - | Referencia al job relacionado (`enmask_jobs.id`). | `"3c85a2fa-13f5-4d0d-9ae4-b8a7be7c7a52"` |
| `user_id` | `VARCHAR(36)` | `String` | No | FK | - | Referencia al ejecutor de la acción (`enmask_users.id`). | `"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"` |
| `user_email` | `VARCHAR(255)` | `String` | No | - | - | Correo del usuario que realizó la acción. | `"admin@enmask.com"` |
| `user_role` | `VARCHAR(50)` | `String` | No | - | - | Rol del usuario al momento de la acción. | `"admin"` |
| `action` | `VARCHAR(100)` | `String` | No | - | `"query"` | Operación realizada. Ejemplos: `query`, `apply_mask`, `restore_backup`. | `"apply_mask"` |
| `is_masked` | `BOOLEAN` | `Boolean` | No | - | - | Indica si los datos accedidos en la acción estaban enmascarados. | `true` |
| `timestamp` | `TIMESTAMP` | `Date` | No | - | *(Hora actual)* | Sello de tiempo de la transacción. | `"2026-07-07 10:15:30.000"` |

* **Restricciones y Reglas de Integridad**:
  * `job_id`: Clave foránea que referencia a `enmask_jobs(id)` con eliminación restringida.
  * `user_id`: Clave foránea que referencia a `enmask_users(id)` con eliminación restringida.

---

### 3.6. Entidad: `VaultBackup` (Respaldos en Vault Seguro)
* **Archivo de dominio**: [vault_repository.py](file:///c:/Users/ACER%5CDownloads%5CFINAL%20FINAL%20FINAL%5Cproyecto-si783-2026-i-u3-enmascaradazo_datos_u3/backend/app/domain/interfaces/vault_repository.py)
* **Archivo físico de respaldo local**: `backend/data/vault_backups.json`
* **Colección física en Base de Datos**: `vault_backups`
* **Descripción**: Almacenamiento seguro temporal de registros originales en texto plano antes del enmascaramiento estático destructivo, posibilitando una posterior restauración.

#### Estructura de Campos

| Campo | Tipo SQL | Tipo BSON | Nulo | Clave | Valor por Defecto | Descripción | Ejemplo |
|---|---|---|---|---|---|---|---|
| `job_id` | `VARCHAR(36)` | `String` | No | FK | - | ID del job que provocó el enmascaramiento destructivo y el respaldo. | `"3c85a2fa-13f5-4d0d-9ae4-b8a7be7c7a52"` |
| `table_name` | `VARCHAR(255)` | `String` | No | - | - | Nombre de la tabla original respaldada. | `"public.enmask_test_customers"` |
| `pk_column` | `VARCHAR(255)` | `String` | Sí | - | `NULL` | Columna clave primaria usada para indexar la fila original. | `"id"` |
| `record_pk` | `VARCHAR(255)` | `String` | No | - | - | Valor de la clave primaria (convertida a texto) que identifica la fila. | `"c53648a1-12c8-40e9-8e42-7bc9a0cd89ef"` |
| `original_data` | `TEXT` | `Object` | No | - | - | Objeto JSON completo con los datos originales antes del enmascaramiento. | `{"email": "ana.garcia@empresa.com", "full_name": "Ana García"}` |

---

## 4. DICCIONARIO DE DATOS (ESQUEMA DE PRUEBA EXTERNO)

* **Archivo de base de datos fuente**: [supabase-enmask-test-data.sql](file:///c:/Users/ACER/Downloads/FINAL%20FINAL%20FINAL/proyecto-si783-2026-i-u3-enmascaradazo_datos_u3/scripts/supabase-enmask-test-data.sql)
* **Tabla física**: `public.enmask_test_customers`
* **Descripción**: Tabla relacional creada en Supabase (PostgreSQL) con fines de prueba y demostración. Contiene información confidencial ficticia (nombres, correos y números telefónicos) sobre la cual se validan los 7 algoritmos de enmascaramiento.

#### Estructura de Campos

| Campo | Tipo SQL | Nulo | Clave | Valor por Defecto | Descripción | Ejemplo |
|---|---|---|---|---|---|---|
| `id` | `UUID` | No | PK | `gen_random_uuid()` | Clave primaria del cliente generado aleatoriamente. | `"c53648a1-12c8-40e9-8e42-7bc9a0cd89ef"` |
| `email` | `TEXT` | No | - | - | Dirección de correo electrónico del cliente (Dato PII sensible). | `"ana.garcia@empresa.com"` |
| `full_name` | `TEXT` | Sí | - | `NULL` | Nombre y apellido del cliente (Dato PII sensible). | `"Ana García"` |
| `phone` | `TEXT` | Sí | - | `NULL` | Número de contacto telefónico del cliente (Dato PII sensible). | `"+52 55 1234 5678"` |
| `created_at` | `TIMESTAMPTZ` | Sí | - | `now()` | Fecha y hora en la que se insertó el registro de prueba. | `"2026-07-07 10:00:00-05"` |
