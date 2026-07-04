# FD04 - Informe de Arquitectura

## Propósito (Modelo 4+1 Vistas)
Este documento provee una visión general comprensiva de la arquitectura del **Motor de Enmascarado Multiformato (Enmascaradazo)**, utilizando el modelo 4+1 vistas (Lógica, Implementación, Procesos, Despliegue y Casos de Uso) para capturar las diferentes perspectivas del sistema.

## Alcance
La arquitectura descrita abarca todos los módulos del motor de ofuscación de datos, la API backend, y el Dashboard frontend, así como sus interacciones con las bases de datos de origen y destino.

## Definición, Siglas y Abreviaturas
- **API:** Application Programming Interface.
- **UI:** User Interface.
- **DTO:** Data Transfer Object.

## Organización del Documento
El documento está organizado según las vistas de arquitectura, seguido de escenarios de calidad.

## Requerimientos Funcionales
- **RF1:** El sistema permitirá conectar a bases de datos SQL y NoSQL.
- **RF2:** El sistema aplicará reglas de enmascaramiento configurables por columna/campo.
- **RF3:** El sistema generará reportes de ejecución.

## Requerimientos No Funcionales – Atributos de Calidad
- **RNF1 (Seguridad):** Los datos extraídos no serán persistidos temporalmente en disco.
- **RNF2 (Rendimiento):** Procesamiento de hasta 1 millón de registros por minuto.

---

## Vista de Caso de Uso

### Diagramas de Casos de Uso

```mermaid
flowchart LR
    A[Usuario QA] -->|Configura| B((Crear Tarea Enmascarado))
    A -->|Visualiza| C((Ver Reportes))
    B --> D((Conectar a Origen y Destino))
    B --> E((Seleccionar Reglas de Desensibilización))
```

### Descripción de Casos de Uso Principales:
- **Crear Tarea Enmascarado:** El usuario especifica las credenciales, selecciona las tablas y aplica las reglas para ofuscar los datos.

---

## Vista Lógica

### Diagrama de Subsistemas (Paquetes)

```mermaid
classDiagram
    class Frontend_UI {
        +Dashboard()
        +Formularios()
    }
    class Backend_API {
        +RutasREST()
        +Auth()
    }
    class Motor_Enmascarado {
        +Transformador()
        +CatalogoReglas()
    }
    class Data_Access {
        +ConectoresSQL()
        +ConectoresNoSQL()
    }
    Frontend_UI --> Backend_API
    Backend_API --> Motor_Enmascarado
    Motor_Enmascarado --> Data_Access
```

### Diagrama de Secuencia (Vista de Diseño)

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as Frontend
    participant API as Backend API
    participant Motor as Core Enmascarado
    participant DB_O as DB Origen
    participant DB_D as DB Destino
    
    Usuario->>UI: Inicia tarea de enmascarado
    UI->>API: POST /api/tasks
    API->>Motor: ejecutar_enmascarado(config)
    Motor->>DB_O: Extraer datos en Batch
    DB_O-->>Motor: Retorna Batch
    Motor->>Motor: Aplicar Transformaciones (En memoria)
    Motor->>DB_D: Insertar Batch Ofuscado
    DB_D-->>Motor: Confirmación
    Motor-->>API: Estado = Completado
    API-->>UI: Notificación Éxito
```

### Diagrama de Colaboración (Vista de Diseño)

```mermaid
flowchart TD
    1((UI)) -- "1: Enviar Petición" --> 2((API Controller))
    2 -- "2: Iniciar Job" --> 3((Worker Motor))
    3 -- "3: Obtener Schema" --> 4((DB Connector))
    4 -- "4: Leer/Escribir Datos" --> 5[(Databases)]
```

### Diagrama de Objetos

```mermaid
classDiagram
    object Tarea1 {
        id = "TASK-001"
        estado = "En progreso"
        motor = "PostgreSQL"
    }
    object Regla1 {
        tipo = "FakerName"
        columna = "nombres"
    }
    Tarea1 -- Regla1 : contiene
```

### Diagrama de Clases

```mermaid
classDiagram
    class MaskingTask {
        +String taskId
        +String status
        +execute()
    }
    class Rule {
        +String targetField
        +apply(data: String): String
    }
    class EmailRule {
        +apply(data: String): String
    }
    Rule <|-- EmailRule
    MaskingTask "1" *-- "*" Rule
```

### Diagrama de Base de Datos (Relacional o No Relacional)

```mermaid
erDiagram
    USERS ||--o{ TASKS : creates
    TASKS ||--o{ RULES : contains
    USERS {
        int id PK
        string username
        string password_hash
    }
    TASKS {
        int id PK
        int user_id FK
        string status
        datetime created_at
    }
    RULES {
        int id PK
        int task_id FK
        string field_name
        string mask_type
    }
```

---

## Vista de Implementación (Vista de Desarrollo)

### Diagrama de Arquitectura de Software (Paquetes)

```mermaid
flowchart LR
    subgraph Capa Presentación
        UI[React App]
    end
    subgraph Capa Lógica (Servicios)
        API[Express / FastAPI]
        TaskQueue[Queue Worker]
    end
    subgraph Capa Datos
        AppDB[(Configuración DB)]
    end
    UI --> API
    API --> TaskQueue
    API --> AppDB
```

### Diagrama de Arquitectura del Sistema (Diagrama de Componentes)

```mermaid
flowchart TD
    C1[Componente Web UI] -->|HTTP/REST| C2[API Gateway Component]
    C2 --> C3[Job Manager Component]
    C3 --> C4[Transformer Engine]
    C4 <-->|Drivers Nativo| C5[Adaptadores Bases de Datos]
```

---

## Vista de Procesos

### Diagrama de Procesos del Sistema (Diagrama de Actividad)

```mermaid
stateDiagram-v2
    [*] --> Pendiente
    Pendiente --> ExtrayendoDatos : Iniciar Trabajo
    ExtrayendoDatos --> AplicandoReglas : Lote Extraído
    AplicandoReglas --> InsertandoDatos : Datos Ofuscados
    InsertandoDatos --> ExtrayendoDatos : Si hay más lotes
    InsertandoDatos --> Finalizado : Fin de lotes
    ExtrayendoDatos --> Error : Falla de Conexión
    Error --> [*]
    Finalizado --> [*]
```

---

## Vista de Despliegue (Vista Física)

### Diagrama de Despliegue

```mermaid
flowchart TB
    subgraph "Cliente"
        Browser(Web Browser)
    end
    
    subgraph "Servidor Dockerizado"
        Frontend[Contenedor Nginx - Frontend]
        Backend[Contenedor Node.js - Backend API]
        Worker[Contenedor Python - Enmascarado Core]
        MetadataDB[(Contenedor PostgreSQL - Config)]
    end
    
    subgraph "Red Corporativa"
        SourceDB[(BBDD Producción)]
        TargetDB[(BBDD QA)]
    end
    
    Browser --> Frontend
    Frontend --> Backend
    Backend --> Worker
    Backend --> MetadataDB
    Worker --> SourceDB
    Worker --> TargetDB
```

---

## Escenario de Funcionalidad
### Escenario 1: Detección de Múltiples Motores
El sistema puede conectar un PostgreSQL de origen y derivar los datos hacia un MySQL destino si los esquemas son compatibles, demostrando la agnosticidad del motor de enmascaramiento.

### Escenario 2: Aplicación de Reglas por Expresión Regular
Se permite buscar patrones como tarjetas de crédito y reemplazar los primeros 12 dígitos por asteriscos en campos de texto libre.

### Escenario 3: Generación de Reportes en Múltiples Formatos
Al terminar una tarea, se expide un reporte en JSON o PDF detallando los campos alterados para auditoría.

---

## Escenario de Usabilidad
### Escenario 1: Interfaz Intuitiva
El usuario mapea tablas y columnas arrastrando (drag-and-drop) o seleccionando en menús desplegables sin escribir queries SQL.

### Escenario 2: Mensajes de Error Claros
Si la conexión a la base de datos de origen falla, se detalla si el error fue por credenciales, host inaccesible, o falta de permisos de lectura.

### Escenario 3: Progreso en Tiempo Real
Un socket en tiempo real mantiene informado al usuario del porcentaje de avance de la ofuscación.

---

## Escenario de Confiabilidad
### Escenario 1: Manejo de Caídas de Red
Si la conexión con el destino falla a la mitad del proceso, la tarea se detiene limpiamente y queda en estado "Error recuperable", sin corromper el metadato del sistema.

### Escenario 2: Integridad Referencial
El sistema mantiene un mapeo consistente. Ej: Si el "ID 10" se reemplaza por "ID 99", las llaves foráneas dependientes también serán actualizadas de manera consistente.

### Escenario 3: Cobertura de Pruebas
El motor de reglas cuenta con >80% de cobertura de pruebas unitarias para asegurar que los datos sensibles nunca escapen intactos por errores de código.

---

## Escenario de Rendimiento
### Escenario 1: Procesamiento por Lotes (Batching)
El sistema extrae datos de 10,000 en 10,000 filas (configurable) para no agotar la RAM del servidor.

### Escenario 2: Uso de Memoria
El pico máximo de consumo de RAM está acotado por el tamaño del lote, haciendo la aplicación predecible.

### Escenario 3: Ejecución Concurrente
Múltiples tablas que no tienen dependencias entre sí pueden ser enmascaradas por el sistema simultáneamente usando multi-threading (hilos).

---

## Escenario de Mantenibilidad
### Escenario 1: Adición de Nuevo Patrón
El sistema utiliza un patrón Strategy; añadir una nueva regla de enmascaramiento implica solo crear una nueva clase heredera, sin modificar el core del procesamiento.

### Escenario 2: Adición de Nuevo Conector
Si la empresa adopta Oracle DB en el futuro, se puede integrar creando un adaptador específico respetando la interfaz de conexión estándar.

---

## Otros Escenarios
### Escenario: Seguridad - Prevención de Exposición
El propio log del sistema de enmascarado ofusca el contenido de los valores; solo indica "Se ofuscaron 5,000 registros en tabla Users".

### Escenario: Compatibilidad Multiplataforma
Los contenedores garantizan que el sistema funcionará de forma idéntica en Windows, Linux y macOS.

---

## Resumen de Atributos de Calidad
- **Alta Extensibilidad:** Arquitectura basada en plugins/adaptadores para motores y reglas.
- **Eficiencia Segura:** Enmascarado al vuelo sin persistir datos en discos intermedios.

## Fortalezas
- Agnosticismo de base de datos.
- Arquitectura limpia y escalable.

## Limitaciones Conocidas
- Puede requerir mucho tiempo para petabytes de datos debido al cuello de botella de la red (I/O).
- No resuelve el enmascarado estructural (cambio de esquemas).

## Roadmap - Fase 2 (Futuro)
- Enmascarado en bases de datos orientadas a grafos.
- Descubrimiento automático de columnas que parecen contener PII usando IA.
