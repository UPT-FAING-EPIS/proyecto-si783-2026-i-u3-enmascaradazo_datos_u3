# FD04 - Informe de Arquitectura

## Propósito (Modelo 4+1 Vistas)
Este documento provee una visión general comprensiva de la arquitectura del **Motor de Enmascarado Multiformato (Enmask v2.0)**, utilizando el modelo 4+1 vistas (Lógica, Implementación, Procesos, Despliegue y Casos de Uso) de Philippe Kruchten para capturar las diferentes perspectivas del sistema.

## Alcance
La arquitectura descrita abarca todos los módulos del motor de ofuscación de datos, la API backend en FastAPI, y la aplicación de control en React+Vite, así como sus interacciones con las bases de datos de origen y destino.

## Definición, Siglas y Abreviaturas
- **API:** Application Programming Interface.
- **UI:** User Interface.
- **DTO:** Data Transfer Object.
- **DDD:** Domain-Driven Design.
- **MCP:** Model Context Protocol.

## Organización del Documento
El documento está organizado según las vistas de arquitectura, seguido de escenarios de calidad y roadmaps del proyecto.

## Requerimientos Funcionales
- **RF1:** El sistema permitirá conectar a bases de datos SQL y NoSQL (9 motores soportados).
- **RF2:** El sistema aplicará reglas de enmascaramiento configurables por columna/campo.
- **RF3:** El sistema generará vistas previas y reportes de ejecución (Jobs) en modo Dry-Run o Apply.
- **RF4:** El sistema contará con autenticación local y control de roles (administrador auditable).

## Requerimientos No Funcionales – Atributos de Calidad
- **RNF1 (Seguridad):** Los datos extraídos no serán persistidos temporalmente de forma insegura; el enmascaramiento se realiza al vuelo y el cifrado simétrico guarda respaldos protegidos en un Vault local.
- **RNF2 (Extensibilidad):** Añadir nuevos motores a través del patrón Factory sin alterar la lógica de Jobs del orquestador.
- **RNF3 (Rendimiento):** Procesamiento eficiente asíncrono con FastAPI y consultas paginadas o por lotes (Batching).

---

## Vista de Caso de Uso

### Diagramas de Casos de Uso

```plantuml
@startuml
left to right direction
skinparam roundcorner 8
skinparam Shadowing false
skinparam ArrowColor #2C3E50
skinparam UsecaseBackgroundColor #ECF0F1
skinparam UsecaseBorderColor #2C3E50

actor "Usuario QA / Dev" as User
actor "Administrador" as Admin

rectangle "Enmask v2.0" {
  usecase "CU-001: Iniciar Sesión" as UC1
  usecase "CU-002: Registrar Conexión" as UC2
  usecase "CU-003: Inspeccionar Esquema (Workbench)" as UC3
  usecase "CU-004: Previsualizar Enmascarado" as UC4
  usecase "CU-005: Ejecutar Job (Dry-run / Apply)" as UC5
  usecase "CU-006: Restaurar / Desencriptar" as UC6
  usecase "CU-007: Auditar Reportes" as UC7
  usecase "CU-008: Gestionar Roles" as UC8
}

User --> UC1
User --> UC2
User --> UC3
User --> UC4
User --> UC5
User --> UC6
User --> UC7

Admin --|> User
Admin --> UC8
@enduml
```

### Descripción de Casos de Uso Principales:
- **Ejecutar Job:** El usuario configura las reglas de protección por campo, y el orquestador ejecuta el enmascarado en modo *Dry-run* (simulación de muestra) o *Apply* (creación física de vistas, columnas duplicadas o reemplazo físico con encriptación reversada).

---

## Vista Lógica

### Diagrama de Subsistemas (Paquetes)

```plantuml
@startuml
skinparam Shadowing false
skinparam PackageBorderColor #34495E
skinparam PackageBackgroundColor #F2F4F4

package "Presentación (React SPA)" {
  [Pages & UI Components] as UI
  [API Client] as Client
  UI --> Client
}

package "Aplicación (FastAPI Monolith)" {
  [Routers (API Endpoints)] as Routers
  [Application Services] as Services
  Client --> Routers : HTTP
  Routers --> Services
}

package "Dominio (Modelo DDD)" {
  [Entities & Interfaces] as Domain
  Services --> Domain
}

package "Infraestructura" {
  [DatabaseFactory & DB Clients] as DB
  [Masking Strategies] as Mask
  [Repositories (Memory/DB)] as Repo
  
  Services --> DB
  Services --> Mask
  Services --> Repo
}
@enduml
```

### Diagrama de Secuencia (Vista de Diseño)

```plantuml
@startuml
autonumber
skinparam Shadowing false

actor Usuario
participant "React Frontend" as UI
participant "FastAPI Backend" as API
participant "JobOrchestrator" as Orch
participant "DB Client" as DB
database "Target DB" as TDB

Usuario -> UI: Inicia tarea de enmascarado
UI -> API: POST /api/v1/jobs/ (rules, mode)
activate API
API -> Orch: create_and_execute_job(conn_id, mode, rules)
activate Orch
Orch -> DB: fetch_records(table, limit)
activate DB
DB -> TDB: SELECT / Extract records
TDB --> DB: Raw records
DB --> Orch: Records list
deactivate DB
Orch -> Orch: Aplicar transformación (Strategies)
alt mode == APPLY
  Orch -> DB: apply_masking_changes(protected_records)
  activate DB
  DB -> TDB: ALTER TABLE / CREATE VIEW / UPDATE
  TDB --> DB: OK
  DB --> Orch: Success
  deactivate DB
end
Orch --> API: JobResult (Completed)
deactivate Orch
API --> UI: HTTP 200 {job_id, status, records}
deactivate API
UI --> Usuario: Mostrar confirmación y métricas
@enduml
```

### Diagrama de Colaboración (Vista de Diseño)

```plantuml
@startuml
skinparam componentStyle uml2
skinparam Shadowing false
left to right direction

component "React UI" as FE
component "FastAPI Controller" as API
component "JobOrchestrator" as Orch
component "DatabaseFactory" as Fact
component "Clients" as Cls
component "MaskingService" as Mask

FE --> API : "1: Iniciar Tarea"
API --> Orch : "2: Orquestar Job"
Orch --> Fact : "3: Solicitar Conector"
Fact --> Cls : "4: Crear Instancia"
Orch --> Mask : "5: Procesar Enmascarado"
@enduml
```

### Diagrama de Objetos

```plantuml
@startuml
skinparam Shadowing false

object "conn1: Connection" as conn {
  id = "conn-001"
  database_type = "postgres"
  host = "localhost"
}

object "job1: MaskingJob" as job {
  id = "job-001"
  run_mode = "APPLY"
  status = "COMPLETED"
}

object "rule1: MaskingRule" as rule {
  target_column = "dni"
  algorithm = "hashing"
  protection_mode = "static_mask"
}

job ..> conn : runs on
rule ..> conn : associated to
job "1" *-- "*" rule : executes
@enduml
```

### Diagrama de Clases

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam Shadowing false

abstract class BaseDeDatos {
  + connect()
  + get_schema(): dict
  + fetch_records(table: str, limit: int): list
  + apply_masking(table: str, rules: list, mode: str): dict
}

class PostgresClient extends BaseDeDatos {
  + connect()
}

class MongoClient extends BaseDeDatos {
  + connect()
}

class DatabaseFactory {
  + {static} get_client(conn: Connection): BaseDeDatos
}

class JobOrchestrator {
  + create_and_execute_job(conn_id: str, mode: str, rules: list): JobResult
}

DatabaseFactory ..> BaseDeDatos : instantiates
JobOrchestrator --> DatabaseFactory : uses
@enduml
```

### Diagrama de Base de Datos (Relacional o No Relacional)

```plantuml
@startuml
skinparam linetype ortho
skinparam Shadowing false

entity "User" as user {
  * id : UUID <<PK>>
  --
  * full_name : str
  * email : str
  * password_hash : str
  * role : str
}

entity "Connection" as conn {
  * id : UUID <<PK>>
  --
  * name : str
  * database_type : str
  * host : str
  * port : int
}

entity "MaskingRule" as rule {
  * id : UUID <<PK>>
  --
  * connection_id : UUID <<FK>>
  * target_table : str
  * target_column : str
  * algorithm : str
}

user "1" --o{ conn : registers
conn "1" --o{ rule : has
@enduml
```

---

## Vista de Implementación (Vista de Desarrollo)

### Diagrama de Arquitectura de Software (Paquetes)

```plantuml
@startuml
skinparam Shadowing false

package "Frontend SPA" {
  [React pages] as Pages
  [API services] as APIClient
  Pages --> APIClient
}

package "Backend Core" {
  [FastAPI Routers] as Routers
  [Application Core Services] as Services
  [Database Adapters] as Adapters
  [Domain Model / VOs] as Domain
  
  Routers --> Services
  Services --> Adapters
  Services --> Domain
}

APIClient --> Routers : REST HTTP
@enduml
```

### Diagrama de Arquitectura del Sistema (Diagrama de Componentes)

```plantuml
@startuml
skinparam Shadowing false
left to right direction

[Vite React Application] as UI
[FastAPI Backend Server] as API
database "Metadata Store (Memory/DB)" as Meta
database "Target DB engines" as Targets

UI --> API : HTTP/JSON Requests
API --> Meta : Query / Persist state
API --> Targets : Read Schemas & Apply Masking
@enduml
```

---

## Vista de Procesos

### Diagrama de Procesos del Sistema (Diagrama de Actividad)

```plantuml
@startuml
skinparam Shadowing false
start
:Registrar Conexión;
:Escanear Esquema;
if (¿Crear Job?) then (sí)
  if (¿Modo Job?) then (Dry-Run)
    :Generar simulación;
    :Calcular tiempos de performance;
  else (Apply)
    :Hacer backup en Vault;
    :Ejecutar reemplazo/vista en destino;
  endif
  :Registrar historial de ejecución;
else (no)
  :Solo previsualizar datos;
endif
stop
@enduml
```

---

## Vista de Despliegue (Vista Física)

### Diagrama de Despliegue

```plantuml
@startuml
skinparam Shadowing false

node "Browser Cliente" {
  artifact "React SPA Bundle" as ClientBundle
}

node "Docker Host (Servidor Aplicación)" {
  node "Contenedor Backend" {
    artifact "FastAPI Application" as BackendApp
  }
  node "Contenedor Metadata DB" {
    database "PostgreSQL / MongoDB" as MetaDB
  }
  BackendApp --> MetaDB : localhost:5432/27017
}

node "Bases de Datos Destino" {
  database "Relational DBs (Postgres, MySQL, Oracle, etc)" as RelDB
  database "NoSQL / Graph DBs (Mongo, Neo4j, Cassandra)" as NoSQLDB
}

ClientBundle --> BackendApp : REST API (port 8000)
BackendApp --> RelDB : Native drivers
BackendApp --> NoSQLDB : Native drivers
@enduml
```

---

## Escenario de Funcionalidad
### Escenario 1: Soporte Multimotor
El sistema puede conectar un PostgreSQL de origen y derivar/enmascarar los datos hacia motores NoSQL (como MongoDB o Redis) de manera agnóstica basándose en la configuración de la conexión.

### Escenario 2: Protección no destructiva (Vistas y Columnas Derivadas)
Para demostraciones seguras, el sistema crea una vista de enmascaramiento (`masked_view`) en lugar de alterar físicamente los datos originales en la tabla.

### Escenario 3: Encriptación reversible
El sistema cifra valores sensibles usando una clave maestra Fernet y permite restaurar la información desde el módulo histórico o de des-enmascarado.

---

## Escenario de Usabilidad
### Escenario 1: Workbench de Enmascaramiento Intuitivo
El usuario mapea tablas y columnas visualmente desde la pantalla **Protección de Datos**, seleccionando el algoritmo y modo en dropdowns y viendo el resultado final inmediatamente.

### Escenario 2: Diagnóstico de Conexiones
Si la conexión falla, el sistema proporciona una sugerencia de diagnóstico detallando si el error se debe a host inalcanzable, credenciales erróneas o drivers ausentes.

---

## Escenario de Confiabilidad
### Escenario 1: Resiliencia de Transacciones
Si una actualización falla físicamente durante la aplicación de enmascaramiento, el Job se marca como `FAILED` y se detiene la secuencia limpia para no dejar la base de datos destino en un estado inconsistente.

### Escenario 2: Integridad Referencial
El sistema mantiene la consistencia de valores enlazados si se definen reglas unificadas por tipo de datos a nivel global.

---

## Escenario de Rendimiento
### Escenario 1: Procesamiento por Lotes
La lectura y enmascaramiento físico de tablas pesadas se procesa en batches paginados para evitar desbordes de memoria RAM en el backend.

### Escenario 2: Asincronismo
El uso de FastAPI asíncrono previene el bloqueo de peticiones de otros usuarios mientras se procesan tareas largas de base de datos.

---

## Escenario de Mantenibilidad
### Escenario 1: Adición de nuevos Algoritmos
Gracias al patrón Strategy, añadir un nuevo tipo de máscara sólo requiere implementar una clase más en `strategies.py` sin reescribir el orquestador principal.

---

## Fortalezas
- Agnosticismo de base de datos completo (9 motores).
- Arquitectura limpia basada en DDD.
- Separación de responsabilidades clara entre UI y backend.

## Limitaciones Conocidas
- Tareas sobre petabytes de datos están acotadas a la capacidad de la red y throughput del driver.

## Roadmap - Fase Futura
- Implementar descubrimiento automático de PII utilizando técnicas avanzadas de expresión regular y heurística.
- Soporte para enmascarado dinámico en tiempo de ejecución.
