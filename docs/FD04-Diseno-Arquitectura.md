# UNIVERSIDAD PRIVADA DE TACNA

## FACULTAD DE INGENIERÍA

### Escuela Profesional de Ingeniería de Sistemas

---

# Proyecto SecOps — Enmask v2.0

## Curso: BASE DE DATOS II

### Docente:
Mag. Patrick Cuadros Quiroga

### Integrantes:
- Flores Navarro, Eduardo Gino (2023076793)
- Choqueña Mauricio, Adrian (2023076799)

---

**Tacna – Perú**
**2026**

---

## CONTROL DE VERSIONES

| Versión | Hecha por | Revisada por | Aprobada por | Fecha | Motivo |
|---|---|---|---|---|---|
| 1.0 | EFN | MAC | — | Junio 2026 | Versión Original |
| 2.0 | EFN | MAC | — | Julio 2026 | Rediseño completo con diagramas PlantUML y alineación con el código real de Enmask v2.0 |

---

# FD04 — Diseño de Arquitectura Software

## Sistema Enmask v2.0

### Multi-DB Masking & Performance Overhead Monitor

---

## ÍNDICE GENERAL

| Nro | Sección | Pág |
|---|---|---|
| **1** | **INTRODUCCIÓN** | **5** |
| 1.1 | Propósito (Diagrama 4+1) | 5 |
| 1.2 | Alcance | 5 |
| 1.3 | Definición, siglas y abreviaturas | 5 |
| 1.4 | Organización del documento | 5 |
| **2** | **OBJETIVOS Y RESTRICCIONES ARQUITECTÓNICAS** | **5** |
| 2.1.1 | Requerimientos Funcionales | 5 |
| 2.1.2 | Requerimientos No Funcionales – Atributos de Calidad | 5 |
| **3** | **REPRESENTACIÓN DE LA ARQUITECTURA DEL SISTEMA** | **6** |
| 3.1 | Vista de Caso de Uso | 6 |
| 3.1.1 | Diagramas de Casos de Uso | 6 |
| 3.2 | Vista Lógica | 6 |
| 3.2.1 | Diagrama de Subsistemas (paquetes) | 7 |
| 3.2.2 | Diagramas de Secuencia (vista de diseño) | 7 |
| 3.2.3 | Diagrama de Colaboración (vista de diseño) | 7 |
| 3.2.4 | Diagrama de Objetos | 7 |
| 3.2.5 | Diagrama de Clases | 7 |
| 3.2.6 | Diagrama de Base de datos (relacional y no relacional) | 7 |
| 3.3 | Vista de Implementación (vista de desarrollo) | 7 |
| 3.3.1 | Diagrama de arquitectura software (paquetes) | 7 |
| 3.3.2 | Diagrama de arquitectura del sistema (componentes) | 7 |
| 3.4 | Vista de Procesos | 7 |
| 3.4.1 | Diagrama de Procesos del sistema (actividad) | 8 |
| 3.5 | Vista de Despliegue (vista física) | 8 |
| 3.5.1 | Diagrama de despliegue | 8 |
| **4** | **ATRIBUTOS DE CALIDAD DEL SOFTWARE** | **8** |
| | Escenario de Funcionalidad | 8 |
| | Escenario de Usabilidad | 8 |
| | Escenario de Confiabilidad | 9 |
| | Escenario de Rendimiento | 9 |
| | Escenario de Mantenibilidad | 9 |
| | Otros Escenarios | 9 |

---

## 1. INTRODUCCIÓN

### 1.1. Propósito (Diagrama 4+1)

El presente documento tiene como propósito definir la **arquitectura software** del sistema **Enmask v2.0**, aplicando el modelo de vistas **"4+1"** de Philippe Kruchten. Este modelo permite describir la arquitectura desde múltiples perspectivas, cada una abordando las preocupaciones de diferentes interesados:

| Vista | Interesado Principal | Propósito |
|---|---|---|
| **Lógica** | Desarrolladores | Estructura de clases, objetos y subsistemas |
| **Procesos** | Integradores de sistemas | Concurrencia, sincronización y flujo de datos |
| **Desarrollo** | Gestores de configuración | Organización del código, módulos y dependencias |
| **Física** | Ingenieros de infraestructura | Despliegue en nodos, contenedores y redes |
| **Casos de Uso** | Todos los interesados | Escenarios que validan las demás vistas |

El documento sirve como referencia técnica para el equipo de desarrollo, el docente del curso y los futuros mantenedores del sistema, garantizando que las decisiones arquitectónicas estén documentadas, justificadas y trazables.

### 1.2. Alcance

El alcance de este documento abarca la arquitectura completa del sistema Enmask v2.0, incluyendo:

- **Backend:** Aplicación monolítica en **FastAPI (Python)** estructurada siguiendo principios de arquitectura limpia y diseño guiado por el dominio (DDD).
- **Frontend:** Aplicación de una sola página (SPA) desarrollada en **React + Vite + TypeScript**, estilizada con Tailwind CSS y equipada con gráficos interactivos.
- **Persistencia de Metadatos:** Configurable mediante repositorios en memoria, MongoDB o PostgreSQL (`REPOSITORY_BACKEND`).
- **Seguridad:** Autenticación local mediante hashes de contraseñas con bcrypt, JWT para la gestión de sesiones, soporte para Google OAuth2 y encriptación simétrica mediante Fernet (AES-128-CBC) gestionada a través de claves maestras.
- **Motores Destino Soportados (9):** PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle Database, Apache Cassandra, MongoDB y Redis.
- **Integraciones Externas:** Extensión de VS Code, Servidor MCP para agentes e IA, y Skills empaquetados para asistentes virtuales.

### 1.3. Definición, siglas y abreviaturas

| Término | Definición |
|---|---|
| **API** | Application Programming Interface |
| **BD** | Base de Datos |
| **DDD** | Domain-Driven Design |
| **FPE** | Format-Preserving Encryption |
| **Fernet** | Algoritmo de cifrado simétrico basado en AES-128-CBC |
| **JWT** | JSON Web Token |
| **PII** | Personally Identifiable Information |
| **RDBMS** | Relational Database Management System |
| **SDM** | Static Data Masking |
| **SRP** | Single Responsibility Principle |
| **REST** | Representational State Transfer |
| **UML** | Unified Modeling Language |
| **MCP** | Model Context Protocol |

### 1.4. Organización del documento

Este documento se estructura en 4 secciones principales:
1. **Introducción** — Contexto y propósito del documento.
2. **Objetivos y Restricciones Arquitectónicas** — Requerimientos que guían las decisiones de diseño.
3. **Representación de la Arquitectura** — Las 5 vistas del modelo 4+1 (Lógica, Procesos, Desarrollo, Física, Casos de Uso) modeladas en PlantUML.
4. **Atributos de Calidad** — Escenarios de evaluación de la arquitectura.

---

## 2. OBJETIVOS Y RESTRICCIONES ARQUITECTÓNICAS

### 2.1.1. Requerimientos Funcionales

Los requerimientos funcionales que impactan directamente en las decisiones arquitectónicas son:

| ID | Requerimiento | Impacto Arquitectónico |
|---|---|---|
| RF-001 | Conectar a motor de BD | Requiere el patrón Factory para instanciar clientes de 9 motores soportados. |
| RF-002 | Previsualización de Datos | Requiere servicio workbench que realice consultas sin persistir cambios (*Dry-Run*). |
| RF-003 | Enmascaramiento por Campo | Requiere diseño extensible de estrategias de enmascaramiento (*Strategy Pattern*). |
| RF-004 | Ejecución de Jobs | Requiere un orquestador asíncrono para ejecutar los modos *dry_run* y *apply*. |
| RF-005 | Cifrado Simétrico | Requiere módulo de criptografía con almacenamiento en Vault local de valores originales. |
| RF-006 | Deshacer / Restaurar | Requiere control transaccional de artefactos creados y des-enmascaramiento del Vault. |
| RF-007 | Panel de Auditoría | Requiere persistir un historial detallado de jobs de enmascaramiento. |
| RF-008 | Autenticación y Roles | Requiere un módulo de autenticación con rol de administrador auditable. |

### 2.1.2. Requerimientos No Funcionales – Atributos de Calidad

| ID | Atributo | Requisito Arquitectónico |
|---|---|---|
| RNF-001 | Rendimiento | Respuestas rápidas en previsualizaciones; procesamiento en streaming o batches en base de datos. |
| RNF-002 | Seguridad | Hashes bcrypt, encriptación Fernet, almacenamiento seguro de llaves de cifrado en variables de entorno o archivos protegidos. |
| RNF-003 | Extensibilidad | Patrón Factory para añadir nuevos clientes de bases de datos sin modificar el núcleo del orquestador. |
| RNF-004 | Concurrencia | FastAPI asíncrono soportado por `asyncio` y clientes asíncronos cuando es posible (`asyncpg`, `aiomysql`). |
| RNF-005 | Portabilidad | Contenerización completa con Docker y orquestación con Docker Compose. |

#### Restricciones Arquitectónicas

| Restricción | Descripción |
|---|---|
| **Lenguaje** | Python 3.12+ (backend), TypeScript (frontend) |
| **Frameworks** | FastAPI (backend), React + Vite (frontend) |
| **Criptografía** | Clave simétrica Fernet de 32 bytes provista por criptografía de Python. |
| **Comunicación** | Protocolo HTTP/JSON (REST) para peticiones web y STDIO JSON-RPC para integraciones MCP. |

---

## 3. REPRESENTACIÓN DE LA ARQUITECTURA DEL SISTEMA

### 3.1. Vista de Caso de Uso

La vista de caso de uso sirve como validación de que la arquitectura soporta las necesidades de negocio del sistema.

#### 3.1.1. Diagramas de Casos de Uso

El siguiente diagrama en PlantUML muestra los actores que interactúan con el sistema Enmask v2.0 y las funcionalidades expuestas.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam roundcorner 8
skinparam Shadowing false
skinparam ArrowColor #2C3E50
skinparam ActorBorderColor #2C3E50
skinparam UsecaseBorderColor #2C3E50
skinparam UsecaseBackgroundColor #ECF0F1

actor "Usuario QA / Dev" as User
actor "Administrador" as Admin

rectangle "Sistema Enmask v2.0" {
  usecase "CU-001: Registrarse" as UC1
  usecase "CU-002: Iniciar Sesión\n(Local / Google OAuth)" as UC2
  usecase "CU-003: Registrar y Probar Conexión" as UC3
  usecase "CU-004: Inspeccionar Esquema (Workbench)" as UC4
  usecase "CU-005: Previsualizar Enmascaramiento" as UC5
  usecase "CU-006: Definir Regla por Campo" as UC6
  usecase "CU-007: Crear y Ejecutar Job\n(Dry-run / Apply)" as UC7
  usecase "CU-008: Restaurar/Desencriptar Datos" as UC8
  usecase "CU-009: Auditar Historial de Jobs" as UC9
  usecase "CU-010: Gestionar Usuarios y Roles" as UC10
}

actor "Google OAuth" as Google
actor "Bases de Datos Destino\n(Relacionales, NoSQL, Grafos)" as DB

User --> UC1
User --> UC2
User --> UC3
User --> UC4
User --> UC5
User --> UC6
User --> UC7
User --> UC8
User --> UC9

Admin --|> User
Admin --> UC10

UC2 -- Google
UC3 -- DB
UC7 -- DB
UC8 -- DB
@enduml
```

**Trazabilidad Casos de Uso → Módulos del Sistema:**

| Caso de Uso | Componentes Involucrados |
|---|---|
| CU-001/002: Registro/Login | `auth.py` (Endpoints), `auth_service.py` (Dominio), `UserRepository` (Metadatos) |
| CU-003: Registrar/Probar Conexión | `connections.py`, `connection_service.py`, `DatabaseFactory` |
| CU-004/005: Inspección & Preview | `workbench.py`, `workbench_service.py`, `DatabaseFactory` |
| CU-006: Definir Regla | `rules.py`, `ConnectionRepository` |
| CU-007: Ejecutar Job | `jobs.py`, `job_orchestrator.py`, `masking_service.py`, `DatabaseFactory` |
| CU-008: Restaurar Datos | `job_orchestrator.py`, `vault_repository.py` |
| CU-009: Auditoría | `reports.py`, `AuditLogRepository` |
| CU-010: Admin Roles | `auth.py`, `auth_service.py` (validación de variable de entorno `ADMIN_EMAILS`) |

---

### 3.2. Vista Lógica

La vista lógica describe la estructura estática del sistema en términos de subsistemas, clases y relaciones de persistencia.

#### 3.2.1. Diagrama de Subsistemas (paquetes)

El sistema está dividido en capas de acuerdo con los principios de Clean Architecture y Domain-Driven Design (DDD).

```plantuml
@startuml
skinparam Shadowing false
skinparam ArrowColor #2C3E50
skinparam PackageBorderColor #34495E
skinparam PackageBackgroundColor #F2F4F4

package "Capa de Presentación (React SPA)" {
  [Pages (Dashboard, Connections, DataProtection, Jobs, Admin)] as Pages
  [Services (api.ts HTTP Client)] as UISvc
  Pages --> UISvc
}

package "Capa de API & Aplicación (FastAPI Backend)" {
  package "API Routers" {
    [auth.py] as R_Auth
    [connections.py] as R_Conn
    [rules.py] as R_Rules
    [jobs.py] as R_Jobs
    [workbench.py] as R_Workbench
  }
  package "Application Services" {
    [AuthService] as Svc_Auth
    [ConnectionService] as Svc_Conn
    [JobOrchestrator] as Svc_Jobs
    [MaskingService] as Svc_Masking
    [WorkbenchService] as Svc_Workbench
  }
  UISvc --> R_Auth : HTTP REST (JSON)
  UISvc --> R_Conn : HTTP REST (JSON)
  UISvc --> R_Rules : HTTP REST (JSON)
  UISvc --> R_Jobs : HTTP REST (JSON)
  UISvc --> R_Workbench : HTTP REST (JSON)

  R_Auth --> Svc_Auth
  R_Conn --> Svc_Conn
  R_Rules --> Svc_Jobs
  R_Jobs --> Svc_Jobs
  R_Workbench --> Svc_Workbench
  Svc_Jobs --> Svc_Masking
  Svc_Workbench --> Svc_Masking
}

package "Capa de Dominio" {
  [Entities (User, Connection, Rule, Job, AuditLog)] as Entities
  [Value Objects (DatabaseType, ProtectionMode, Algorithm)] as VOs
  [Interfaces (Repository, MaskingStrategy)] as Interfaces
  Svc_Auth --> Entities
  Svc_Conn --> Entities
  Svc_Jobs --> Entities
  Svc_Masking --> Interfaces
}

package "Capa de Infraestructura" {
  [DatabaseFactory & DB Clients\n(PostgreSQL, MySQL, SQLServer, SQLite,\nOracle, Cassandra, MongoDB, Redis, Neo4j)] as DB_Clients
  [Masking Strategies\n(Hashing, Redaction, Substitution,\nNullification, Fpe, Perturbation)] as Mask_Strats
  [Repositories (InMemory, MongoDB, Postgres)] as Repos
  
  Svc_Conn --> DB_Clients
  Svc_Jobs --> DB_Clients
  Svc_Workbench --> DB_Clients
  Svc_Masking --> Mask_Strats
  Svc_Auth --> Repos
  Repos ..|> Interfaces
  Mask_Strats ..|> Interfaces
}

database "Bases de Datos Externas" as Ext_DB
DB_Clients --> Ext_DB : Native Connections
@enduml
```

#### 3.2.2. Diagramas de Secuencia (vista de diseño)

##### Secuencia: Autenticación de Usuario (Login)

```plantuml
@startuml
autonumber
skinparam Shadowing false
skinparam ArrowColor #2C3E50
skinparam ParticipantBorderColor #2C3E50
skinparam ParticipantBackgroundColor #ECF0F1

actor Usuario
participant "React Frontend\n(Login.tsx)" as FE
participant "FastAPI Router\n(auth.py)" as R_Auth
participant "AuthService\n(auth_service.py)" as S_Auth
participant "UserRepository\n(InMemory / MongoDB)" as Repo
database "Metadata DB" as DB

Usuario -> FE : Ingresa email y contraseña
FE -> R_Auth : POST /api/v1/auth/login\n{email, password}
activate R_Auth
R_Auth -> S_Auth : authenticate_user(email, password)
activate S_Auth
S_Auth -> Repo : get_by_email(email)
activate Repo
Repo -> DB : Consultar usuario
DB --> Repo : Retorna datos de usuario
Repo --> S_Auth : Retorna entidad User
deactivate Repo
S_Auth -> S_Auth : verificar password_hash\n(bcrypt.verify)
alt Credenciales válidas
  S_Auth -> S_Auth : create_access_token(user_id, rol)
  S_Auth --> R_Auth : Retorna access_token & token_type
  R_Auth --> FE : HTTP 200 {access_token, token_type, user}
  FE -> FE : Guardar token en localStorage\ny actualizar estado
  FE --> Usuario : Redirigir al Dashboard
else Credenciales inválidas
  S_Auth --> R_Auth : Lanzar HTTPException(401)
  deactivate S_Auth
  R_Auth --> FE : HTTP 401 Unauthorized
  deactivate R_Auth
  FE --> Usuario : Mostrar mensaje de error
end
@enduml
```

##### Secuencia: Ejecución de Job de Enmascaramiento

```plantuml
@startuml
autonumber
skinparam Shadowing false
skinparam ArrowColor #2C3E50

actor "Usuario QA" as User
participant "React Frontend\n(DataProtection.tsx / Jobs.tsx)" as FE
participant "Jobs Router\n(jobs.py)" as R_Jobs
participant "JobOrchestrator\n(job_orchestrator.py)" as S_Jobs
participant "DatabaseFactory\n(factory.py)" as Factory
participant "DBClient\n(PostgresClient, etc.)" as Client
database "Target Database" as TargetDB
participant "MaskingService\n(masking_service.py)" as S_Masking
participant "MaskingStrategy\n(strategies.py)" as Strat
database "Vault Repository\n(vault_repository.py)" as Vault

User -> FE : Configura reglas y ejecuta Job (Modo: Apply / Dry-run)
FE -> R_Jobs : POST /api/v1/jobs/\n{connection_id, run_mode, rules}
activate R_Jobs
R_Jobs -> S_Jobs : create_and_execute_job(conn_id, run_mode, rules)
activate S_Jobs
S_Jobs -> S_Jobs : Registrar Job (Estado: PENDING)


S_Jobs -> Factory : get_client(connection_entity)
activate Factory
Factory -> Client : Instanciar cliente específico
Factory --> S_Jobs : Retorna DBClient
deactivate Factory

S_Jobs -> Client : connect()
S_Jobs -> Client : fetch_records(table, limit)
activate Client
Client -> TargetDB : Ejecuta query de extracción
TargetDB --> Client : Retorna registros crudos
Client --> S_Jobs : Retorna registros
deactivate Client

loop Para cada registro
  loop Para cada regla por campo
    S_Jobs -> S_Masking : mask_value(value, strategy, protection_mode)
    activate S_Masking
    S_Masking -> Strat : mask(value, options)
    activate Strat
    Strat --> S_Masking : Retorna valor enmascarado
    deactivate Strat
    
    alt run_mode == APPLY
      alt protection_mode == static_mask o symmetric_encryption
        S_Masking -> Vault : store_original_value(job_id, table, col, original_val)
      end
    end
    S_Masking --> S_Jobs : Retorna valor final protegido
    deactivate S_Masking
  end
end

alt run_mode == APPLY
  S_Jobs -> Client : apply_masking_changes(table, protection_mode, protected_records)
  activate Client
  Client -> TargetDB : Crear vistas / agregar columnas / actualizar registros físicos
  TargetDB --> Client : Confirmación
  Client --> S_Jobs : Éxito
  deactivate Client
  S_Jobs -> S_Jobs : Actualizar Job (Estado: COMPLETED)
else run_mode == DRY_RUN
  S_Jobs -> S_Jobs : Guardar muestra en logs de Job (sin modificar base de datos)
  S_Jobs -> S_Jobs : Actualizar Job (Estado: COMPLETED)
end

S_Jobs --> R_Jobs : Retorna resultado de ejecución
deactivate S_Jobs
R_Jobs --> FE : HTTP 200 {job_id, status, records_processed, artifacts_generated}
deactivate R_Jobs
FE --> User : Mostrar resumen y métricas de rendimiento del Job
@enduml
```

#### 3.2.3. Diagrama de Colaboración (vista de diseño)

El siguiente diagrama representa cómo los diferentes componentes del backend colaboran para cumplir con el proceso de enmascaramiento.

```plantuml
@startuml
skinparam componentStyle uml2
left to right direction
skinparam Shadowing false

rectangle "Capa Presentación" {
  component "React UI\n(Browser)" as FE
}

rectangle "Capa API Gateway" {
  component "FastAPI App\n(main.py + Router)" as API
}

rectangle "Capa de Aplicación" {
  component "JobOrchestrator\n(job_orchestrator.py)" as S_Jobs
  component "MaskingService\n(masking_service.py)" as S_Masking
}

rectangle "Capa de Infraestructura" {
  component "DatabaseFactory\n(factory.py)" as Factory
  component "DB Clients\n(Postgres, Mongo, Neo4j, etc.)" as Clients
  component "Masking Strategies\n(strategies.py)" as Strats
}

database "Target DBs\n(MySQL, PostgreSQL,\nNeo4j, Cassandra, etc.)" as ExtDB

FE --> API : 1: HTTP/JSON - Iniciar Job / Retornar resultado
API --> S_Jobs : 2: create_and_execute_job()
S_Jobs --> Factory : 3: get_client()
Factory --> Clients : 4: Crear conector
Clients --> ExtDB : 5: Conectar y extraer registros
S_Jobs --> S_Masking : 6: mask_value()
S_Masking --> Strats : 7: mask()
@enduml
```

#### 3.2.4. Diagrama de Objetos

Este diagrama de objetos describe las instancias que se relacionan en tiempo de ejecución para ejecutar un Job sobre una conexión específica.

```plantuml
@startuml
skinparam Shadowing false

object "conn_postgres: Connection" as conn1 {
  id = "conn-001"
  name = "PostgreSQL Local"
  database_type = DatabaseType.POSTGRES
  host = "localhost"
  port = 5432
  database = "users_db"
  username = "postgres"
  is_active = true
}

object "rule_hashing: MaskingRule" as rule1 {
  id = "rule-001"
  connection_id = "conn-001"
  target_table = "public.users"
  target_column = "dni"
  algorithm = MaskingAlgorithm.HASHING
  protection_mode = ProtectionMode.STATIC_MASK
  strategy_options = {"salt": "academic_secops"}
}

object "rule_redaction: MaskingRule" as rule2 {
  id = "rule-002"
  connection_id = "conn-001"
  target_table = "public.users"
  target_column = "email"
  algorithm = MaskingAlgorithm.REDACTION
  protection_mode = ProtectionMode.VIRTUAL_VIEW
  strategy_options = {"mask_char": "*", "preserve_domain": true}
}

object "job_apply: MaskingJob" as job1 {
  id = "job-001"
  connection_id = "conn-001"
  run_mode = MaskingRunMode.APPLY
  status = "COMPLETED"
  records_processed = 1250
  artifacts_generated = ["public.users_masked_view", "public.users.email_masked"]
  created_at = 2026-07-04T13:00:00
}

object "user_admin: User" as user1 {
  id = "user-100"
  full_name = "Eduardo Flores"
  email = "admin@demo.com"
  role = "admin"
  provider = "local"
}

job1 ..> conn1 : "ejecutado sobre"
rule1 ..> conn1 : "asociada a"
rule2 ..> conn1 : "asociada a"
job1 "1" *-- "*" rule1 : "ejecuta"
job1 "1" *-- "*" rule2 : "ejecuta"
user1 ..> job1 : "crea y monitorea"
@enduml
```

#### 3.2.5. Diagrama de Clases

El diseño orientado a objetos del backend utiliza el patrón **Factory** para abstracción de motores y **Strategy** para la flexibilidad de algoritmos de enmascaramiento.

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam Shadowing false

abstract class BaseDeDatos {
  # connection_uri: str
  + {abstract} connect()
  + {abstract} test_connection(): bool
  + {abstract} get_schema(): dict
  + {abstract} fetch_records(table: str, limit: int): list
  + {abstract} apply_masking(table: str, rules: list, mode: str): dict
}

class PostgresClient extends BaseDeDatos {
  + connect()
  + test_connection(): bool
  + get_schema(): dict
  + fetch_records(table: str, limit: int): list
  + apply_masking(table: str, rules: list, mode: str): dict
}

class MongoClient extends BaseDeDatos {
  + connect()
  + get_schema(): dict
  + fetch_records(table: str, limit: int): list
  + apply_masking(table: str, rules: list, mode: str): dict
}

class Neo4jClient extends BaseDeDatos {
  + connect()
  + get_schema(): dict
  + fetch_records(table: str, limit: int): list
  + apply_masking(table: str, rules: list, mode: str): dict
}

class DatabaseFactory {
  + {static} get_client(conn: Connection): BaseDeDatos
}

class MaskingService {
  - strategies: dict
  + mask_value(val: any, strat: str, mode: str, opts: dict): any
}

interface MaskingStrategy {
  + mask(val: any, opts: dict): any
}

class HashingStrategy implements MaskingStrategy {
  + mask(val: any, opts: dict): any
}

class RedactionStrategy implements MaskingStrategy {
  + mask(val: any, opts: dict): any
}

class SubstitutionStrategy implements MaskingStrategy {
  + mask(val: any, opts: dict): any
}

class JobOrchestrator {
  - conn_service: ConnectionService
  - masking_service: MaskingService
  + create_and_execute_job(conn_id: str, mode: str, rules: list): JobResult
  + rollback_job(job_id: str): dict
}

DatabaseFactory ..> BaseDeDatos : "instancia"
JobOrchestrator --> DatabaseFactory : "usa"
JobOrchestrator --> MaskingService : "delega en"
MaskingService "1" *-- "*" MaskingStrategy : "contiene"
@enduml
```

#### 3.2.6. Diagrama de Base de datos (relacional y no relacional)

##### Modelo Lógico de Metadatos (SQLite / MongoDB / PostgreSQL)

Representa las tablas que soportan el funcionamiento interno del sistema (usuarios, conexiones configuradas, reglas y auditoría).

```plantuml
@startuml
skinparam linetype ortho
skinparam Shadowing false

entity "User" as user {
  * id : UUID <<PK>>
  --
  * full_name : str
  * email : str <<UNIQUE>>
  * password_hash : str
  * role : str (admin / user)
  * provider : str (local / google)
  * created_at : datetime
}

entity "Connection" as conn {
  * id : UUID <<PK>>
  --
  * name : str
  * database_type : DatabaseType <<Enum>>
  * host : str
  * port : int
  * database : str
  * username : str
  * password_encrypted : str
  * is_active : bool
  * created_by : UUID <<FK>>
  * created_at : datetime
}

entity "MaskingRule" as rule {
  * id : UUID <<PK>>
  --
  * connection_id : UUID <<FK>>
  * target_table : str
  * target_column : str
  * algorithm : MaskingAlgorithm <<Enum>>
  * protection_mode : ProtectionMode <<Enum>>
  * strategy_options : json
  * created_at : datetime
}

entity "MaskingJob" as job {
  * id : UUID <<PK>>
  --
  * connection_id : UUID <<FK>>
  * run_mode : MaskingRunMode <<Enum>>
  * status : JobStatus <<Enum>>
  * records_processed : int
  * artifacts_generated : json (views, columns, backups)
  * execution_time_ms : float
  * error_message : str
  * created_by : UUID <<FK>>
  * created_at : datetime
}

entity "AuditLog" as audit {
  * id : UUID <<PK>>
  --
  * user_id : UUID <<FK>>
  * action : str
  * entity_type : str
  * entity_id : UUID
  * details : json
  * ip_address : str
  * timestamp : datetime
}

user "1" --o{ conn : "registra"
conn "1" --o{ rule : "tiene"
conn "1" --o{ job : "ejecuta en"
user "1" --o{ job : "inicia"
user "1" --o{ audit : "genera"
@enduml
```

##### Modelos de Datos en Motores Externos (Destinos de Ejemplo)

- **MongoDB (Colección NoSQL):** Soportado mediante mapeo de objetos planos de BSON.
  ```json
  {
    "_id": "64b1f45c8f2a4f001a2b3c4d",
    "nombre": "Eduardo Flores",
    "email": "edu@mail.com",
    "dni": "12345678",
    "dni_masked": "1234****",
    "telefono": "+51 987654321"
  }
  ```

- **Neo4j (Modelo de Grafos):** Soportado a nivel de propiedades del Label.
  ```text
  (:Persona {nombre: "Eduardo", dni: "12345678", dni_masked: "1234****"}) -[:TRABAJA_EN]-> (:Empresa {razon_social: "SecOps SAC"})
  ```

---

### 3.3. Vista de Implementación (vista de desarrollo)

La vista de desarrollo muestra la organización del código fuente en módulos físicos y sus dependencias.

#### 3.3.1. Diagrama de arquitectura software (paquetes)

El siguiente diagrama representa la jerarquía física y distribución de componentes dentro del repositorio.

```plantuml
@startuml
skinparam Shadowing false

package "proyecto-enmask" {
  package "frontend" {
    folder "src" as FE_src {
      folder "pages" as FE_pages
      folder "components" as FE_comps
      folder "services" as FE_svcs
      file "App.tsx" as FE_app
      file "main.tsx" as FE_main
      file "index.css" as FE_css
    }
    file "package.json" as FE_pkg
    file "vite.config.ts" as FE_vite
  }
  
  package "backend" {
    folder "app" as BE_app {
      folder "api" as BE_api {
        file "routers/*" as BE_routers
      }
      folder "application" as BE_appl {
        file "services/*" as BE_svcs
      }
      folder "domain" as BE_dom {
        file "entities/*" as BE_ents
        file "interfaces/*" as BE_intfs
        file "value_objects/*" as BE_vos
      }
      folder "infrastructure" as BE_infra {
        folder "db" as BE_db_clients {
          file "factory.py" as BE_fact
          file "*_client.py" as BE_clients
        }
        folder "masking" as BE_mask_strat {
          file "strategies.py" as BE_strats
        }
      }
      file "main.py" as BE_main_py
    }
    file "requirements.txt" as BE_reqs
    file ".env.example" as BE_env
  }

  package "integrations" {
    folder "mcp" as Int_mcp {
      folder "enmask-mcp-server" as MCP_srv
    }
    folder "vscode" as Int_vs {
      folder "enmask-vscode" as VS_ext
    }
    folder "skills" as Int_skills {
      file "skill.zip" as Skill_zips
    }
  }
}
@enduml
```

#### 3.3.2. Diagrama de arquitectura del sistema (componentes)

Muestra los componentes del sistema en ejecución y cómo se comunican de forma desacoplada mediante protocolos definidos.

```plantuml
@startuml
skinparam componentStyle uml2
skinparam Shadowing false

[React SPA Frontend] as FE
[FastAPI Monolithic Backend] as BE

package "Componentes Internos del Backend" {
  [API Router Gateway] as Router
  [Auth Service] as AuthSvc
  [Connection Service] as ConnSvc
  [Job Orchestrator] as JobOrch
  [Masking Core Service] as MaskSvc
  [Database Factory] as DBFactory
  [Native DB Connectors] as DBConnectors
  [Vault Backup System] as Vault
}

database "Metadata Repository\n(Memory / MongoDB / Postgres)" as MetaDB

FE --> Router : HTTP REST / JSON
Router --> AuthSvc
Router --> ConnSvc
Router --> JobOrch
Router --> MaskSvc

AuthSvc --> MetaDB : Persistencia de Usuarios y Sesiones
ConnSvc --> MetaDB : Persistencia de Metadatos de Conexiones
JobOrch --> MetaDB : Persistencia de Jobs y Auditoría

JobOrch --> DBFactory : get_client()
DBFactory --> DBConnectors : Instancia conectores
JobOrch --> MaskSvc : mask_value()
MaskSvc --> Vault : Almacena backups de originales

database "External DB Targets\n(PostgreSQL, MySQL, SQLServer, SQLite,\nOracle, Cassandra, MongoDB, Redis, Neo4j)" as Targets

DBConnectors --> Targets : Read / Write (TCP / Native Protocol)
@enduml
```

---

### 3.4. Vista de Procesos

La vista de procesos aborda la concurrencia, sincronización de hilos y el flujo dinámico de ejecución de tareas críticas en el sistema.

#### 3.4.1. Diagrama de Procesos del sistema (diagrama de actividad)

El flujo dinámico del proceso desde la autenticación hasta la ejecución de enmascaramiento se representa a continuación:

```plantuml
@startuml
skinparam Shadowing false

start
:Usuario inicia sesión en Frontend;

if (¿Autenticación exitosa?) then (sí)
  :Dashboard cargado (resumen ejecutivo);
  :Registrar o seleccionar Conexión;
  :Probar conexión activa;

  if (¿Conexión exitosa?) then (sí)
    :Inspeccionar esquema (tablas/campos);
    :Mapear reglas de enmascaramiento por campo;
    :Previsualizar enmascaramiento al vuelo (Workbench/WorkbenchService);

    if (¿Confirmar ejecución?) then (sí)
      if (¿Modo de Ejecución?) then (DRY_RUN)
        :Ejecutar benchmark sin alterar la BD;
        :Medir tiempo de consulta normal, masking y cifrado;
        :Mostrar muestra enmascarada y tiempos en frontend;
      else (APPLY)
        :Crear copia de seguridad en Vault;
        :Aplicar enmascarado (vista, columna derivada, encriptación);
        :Registrar logs de auditoría;
      endif
    else (no)
      :Descartar cambios;
    endif

  else (no)
    :Mostrar error de conexión (diagnóstico de drivers/puertos/credenciales);
  endif

else (no)
  :Mostrar error de login;
endif

stop
@enduml
```

---

### 3.5. Vista de Despliegue (vista física)

La vista física describe la distribución física del sistema en hardware o contenedores de red, incluyendo los protocolos de interconexión.

#### 3.5.1. Diagrama de despliegue

El despliegue de Enmask v2.0 se realiza típicamente usando contenedores independientes orquestados por Docker Compose en entornos de desarrollo/QA, o a través de servicios de aplicación en la nube (Render).

```plantuml
@startuml
skinparam Shadowing false

node "Dispositivo Cliente" as ClientNode {
  node "Navegador Web" as Browser {
    artifact "React + Vite SPA\n(HTML5, Tailwind, TS)" as FE_App
  }
}

node "Servidor Local / Nube (Docker Host)" as ServerNode {
  node "Contenedor: enmask-backend" as BackendCont {
    artifact "FastAPI App\n(Uvicorn)" as BE_App
  }

  node "Contenedor: metadata-db" as MetaCont {
    database "MongoDB / PostgreSQL\n(Persistencia de metadatos)" as MetaDB
  }
  
  BE_App --> MetaDB : TCP :27017 / :5432
}

node "Red Corporativa / Proveedores Cloud" as CloudDBs {
  database "PostgreSQL (:5432)" as PG
  database "MySQL / MariaDB (:3306)" as MY
  database "SQL Server (:1433)" as MS
  database "MongoDB (:27017)" as MO
  database "Redis (:6379)" as RE
  database "Neo4j (:7687)" as NE
  database "Cassandra (:9042)" as CA
  database "Oracle (:1521)" as OR
  database "SQLite (local file)" as SQ
}

FE_App --> BE_App : HTTPS / REST (:8000)
BE_App --> PG : asyncpg
BE_App --> MY : aiomysql
BE_App --> MS : pymssql
BE_App --> MO : motor / pymongo
BE_App --> RE : redis-py
BE_App --> NE : neo4j-driver
BE_App --> CA : cassandra-driver
BE_App --> OR : python-oracledb
BE_App --> SQ : sqlite3 (local)
@enduml
```

---

## 4. ATRIBUTOS DE CALIDAD DEL SOFTWARE

Los atributos de calidad se evalúan mediante escenarios estructurados que describen el comportamiento esperado frente a estímulos del entorno.

### Escenario de Funcionalidad

| Aspecto | Descripción |
|---|---|
| **Escenario** | Un usuario autenticado ejecuta una previsualización de enmascaramiento en el Workbench. |
| **Estímulo** | Solicitud POST `/api/v1/workbench/preview` enviando reglas definidas. |
| **Respuesta del sistema** | El orquestador extrae los registros de la base de datos origen usando el cliente correcto, aplica los algoritmos de enmascaramiento configurados sin guardarlos en la base de datos destino, y devuelve el resultado en menos de 2 segundos. |
| **Medida de calidad** | Validación visual en el Workbench con los datos correctos ofuscados; no se altera el dato original en este paso. |
| **Arquitectura implicada** | `workbench.py` (Router) → `WorkbenchService` → `DatabaseFactory` → `MaskingService` → `strategies.py` |

### Escenario de Usabilidad

| Aspecto | Descripción |
|---|---|
| **Escenario** | El usuario necesita configurar un enmascaramiento para una base de datos documental (MongoDB). |
| **Estímulo** | Selección de MongoDB en la pantalla de "Conexiones" e ingreso de URI. |
| **Respuesta del sistema** | El sistema valida la estructura de la conexión, extrae las colecciones y muestra un Workbench adaptado a campos JSON de documentos en lugar de columnas tabulares rígidas. |
| **Medida de calidad** | El usuario finaliza la configuración en 3 clics y obtiene previsualización inmediata. |
| **Arquitectura implicada** | React UI (`Connections.tsx`) → `ConnectionService` → `MongoClient` |

### Escenario de Confiabilidad

| Aspecto | Descripción |
|---|---|
| **Escenario** | Fallo en la comunicación de red con una base de datos remota a mitad de un Job. |
| **Estímulo** | Pérdida de socket TCP durante la ejecución del job. |
| **Respuesta del sistema** | El conector de base de datos correspondiente atrapa el error de red, aborta el job de forma segura, cambia su estado a `FAILED` en los metadatos y guarda el mensaje detallado de error para auditoría sin corromper la consistencia de los datos ya procesados. |
| **Medida de calidad** | Estado consistente en la base de datos y reporte de fallo con diagnóstico claro en el historial de Jobs. |
| **Arquitectura implicada** | `job_orchestrator.py` → `BaseDeDatos` (Manejo de excepciones) → `AuditLogRepository` |

### Escenario de Rendimiento

| Aspecto | Descripción |
|---|---|
| **Escenario** | Múltiples peticiones concurrentes de previsualización sobre el backend. |
| **Estímulo** | 20 peticiones simultáneas desde diferentes clientes. |
| **Respuesta del sistema** | FastAPI maneja las solicitudes asíncronas de manera concurrente usando el bucle de eventos (`asyncio`), repartiendo la carga de procesamiento sin saturar el hilo principal. |
| **Medida de calidad** | Tiempo de respuesta promedio menor a 3 segundos; uso de CPU controlado (< 70%). |
| **Arquitectura implicada** | Uvicorn Server → FastAPI Router → Async Services |

### Escenario de Mantenibilidad

| Aspecto | Descripción |
|---|---|
| **Escenario** | Se requiere agregar un nuevo algoritmo de enmascaramiento por requerimiento regulatorio. |
| **Estímulo** | Modificación del código fuente para añadir el algoritmo. |
| **Respuesta del sistema** | El desarrollador crea una nueva clase en `strategies.py` implementando la interfaz `MaskingStrategy` y la registra en el diccionario de estrategias del `MaskingService`. No se requiere modificar el orquestador principal. |
| **Medida de calidad** | Tiempo de desarrollo < 1 hora; cero cambios en la lógica de control del orquestador. |
| **Arquitectura implicada** | `strategies.py` (Strategy Pattern) → `MaskingService` |

---

*Documento FD04 — Diseño de Arquitectura Software*
*Sistema Enmask v2.0 — Multi-DB Masking & Performance Overhead Monitor*
*Versión 2.0 — Julio 2026*
