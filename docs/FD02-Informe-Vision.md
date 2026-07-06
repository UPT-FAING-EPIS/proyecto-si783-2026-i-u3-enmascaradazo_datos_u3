# FD02 - Informe de Visión

## UNIVERSIDAD PRIVADA DE TACNA
### FACULTAD DE INGENIERÍA
#### Escuela Profesional de Ingeniería de Sistemas

---

## CONTROL DE VERSIONES

| Versión | Hecha por | Revisada por | Aprobada por | Fecha | Motivo |
|---|---|---|---|---|---|
| 1.0 | EFN | MAC | — | Junio 2026 | Versión Original |
| 2.0 | EFN | MAC | — | Julio 2026 | Ampliación exhaustiva académica para proyecto universitario (1000+ líneas) |

---

## 1. INTRODUCCIÓN

### 1.1 Propósito
El propósito de este documento es definir la visión estratégica, el alcance detallado del producto y las características funcionales y no funcionales de alto nivel del sistema **Enmask v2.0**. Este informe sirve como guía y marco de alineación para el equipo de desarrollo, los administradores de sistemas y los oficiales de seguridad de la información.

### 1.2 Alcance
El sistema provee una plataforma unificada para la gobernanza y protección de datos que se conecta a bases de datos corporativas y aplica reglas de enmascaramiento estático y dinámico sobre información identificable (PII). Está diseñado para ser operado por ingenieros de QA, desarrolladores y DBAs, permitiéndoles aprovisionar bases de datos seguras e inconsistencias referenciales para pruebas en entornos no productivos.

### 1.3 Definiciones, Siglas y Abreviaturas
- **PII (Personally Identifiable Information):** Datos que permiten identificar de forma directa o indirecta a una persona (e.g. nombres, DNI, teléfono, correos, datos de geolocalización).
- **QA (Quality Assurance):** Módulo o personal dedicado al aseguramiento de calidad del software.
- **SDM (Static Data Masking):** Enmascaramiento estático de datos, donde la base de datos destino es modificada físicamente de forma permanente.
- **Vault:** Repositorio encriptado local que almacena temporalmente los respaldos de datos crudos antes de la aplicación del enmascaramiento estático.
- **Overhead:** Retraso o impuesto de rendimiento sobre las consultas generado por el cifrado o procesamiento adicional.

### 1.4 Referencias
- Documento FD01 — Informe de Factibilidad de Enmask v2.0.
- Ley N° 29733 — Ley de Protección de Datos Personales (Perú).
- GDPR — Reglamento General de Protección de Datos de la Unión Europea.

---

## 2. POSICIONAMIENTO DEL PRODUCTO

### 2.1 Oportunidad de Negocio
Con la digitalización de los servicios corporativos, los datos se han convertido en el activo más crítico pero también en la mayor vulnerabilidad de cumplimiento legal. Las organizaciones deben realizar pruebas de software con datos realistas para simular comportamientos de usuarios de forma exacta. Sin embargo, utilizar datos reales de clientes en entornos de desarrollo sin cifrado ni ofuscación constituye un delito grave de violación de privacidad. 

La oportunidad de **Enmask v2.0** es ofrecer una solución automatizada, multimotor (9 motores), de-sensibilizadora y con telemetría de rendimiento integrada para que los equipos de TI trabajen de forma ágil y 100% segura.

### 2.2 Definición del Problema

| Dimensión | Detalle |
|---|---|
| **El problema de** | Exposición involuntaria de información confidencial y PII de clientes en redes y bases de datos locales no productivas. |
| **Afecta a** | Desarrolladores, ingenieros de QA, auditores de sistemas y directores de cumplimiento corporativo. |
| **Cuyo impacto es** | Pérdida de la reputación corporativa, multas de entes reguladores de protección de datos, y vulnerabilidad ante intrusiones externas. |
| **Una solución ideal** | Automatizaría el proceso de enmascarado y cifrado por medio de una interfaz visual centralizada que soporte bases relacionales y NoSQL, con trazabilidad inmutable y respaldos en un Vault seguro. |

---

## 3. DESCRIPCIÓN DE LOS INTERESADOS Y USUARIOS

Para asegurar el éxito del sistema, Enmask v2.0 aborda las necesidades de diferentes perfiles dentro de la organización de TI:

### 3.1 Perfiles de los Interesados (Stakeholders)

- **Oficial de Seguridad (CISO):**
  - *Rol:* Asegurar que ninguna información PII real toque entornos no productivos.
  - *Necesidades críticas:* Logs de auditoría, reportes PDF de jobs ejecutados y no persistencia física de datos productivos en el backend.
- **Director de TI / Product Owner:**
  - *Rol:* Agilizar el ciclo de desarrollo y entregas de software (Time-to-Market).
  - *Necesidades críticas:* Aprovisionamiento rápido de bases de datos para pruebas, sin fricciones burocráticas.

### 3.2 Perfiles de los Usuarios Finales

- **Ingenieros de QA / Desarrolladores:**
  - *Rol:* Configurar reglas de enmascaramiento por campo y evaluar la integridad lógica de las tablas enmascaradas.
  - *Necesidades críticas:* Panel workbench visual e intuitivo, previsualizaciones rápidas de enmascarado y extensión para VS Code.
- **Administrador de Bases de Datos (DBA):**
  - *Rol:* Registrar conexiones seguras a motores productivos y cloud, y monitorear el impacto del rendimiento de las consultas.
  - *Necesidades críticas:* Monitoreo de telemetría de rendimiento (overhead) y gestión de restauraciones desde el Vault.

---

## 4. VISTA GENERAL DEL PRODUCTO

### 4.1 Perspectiva del Producto
Enmask v2.0 se despliega de forma centralizada en contenedores Docker y actúa como una plataforma puente SecOps:

![Perspectiva de Alto Nivel de Enmask](./diagrams/fd02_vision.png)

### 4.2 Resumen de Capacidades del Producto
- **Workbench Multi-DB:** Exploración en tiempo real de esquemas y colecciones para PostgreSQL, MySQL, SQL Server, MongoDB, Cassandra, Redis, Neo4j, Oracle y SQLite.
- **Configuración Granular:** Reglas por campo con algoritmos especializados (hashing, sustitución por diccionarios deterministas de Faker, anulación y encriptación simétrica).
- **Vault de Restauración:** Cifrado simétrico AES-256 de valores antes de aplicar enmascaramiento estático, facilitando la des-ofuscación si es requerida por administradores.
- **Módulo de Benchmarking:** Ejecución en modo `dry_run` con medición de latencias para reportar cuantitativamente la sobrecarga (overhead) en milisegundos.
- **Integraciones Inteligentes:** Servidor stdio MCP para Claude Desktop y extensión oficial de VS Code.

---

## 5. CARACTERÍSTICAS DETALLADAS DEL PRODUCTO


### 5.1 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-01
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.2 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-02
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.3 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-03
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.4 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-04
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.5 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-05
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.6 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-06
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.7 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-07
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.8 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-08
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.9 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-09
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.10 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-10
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.11 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-11
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.12 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-12
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.13 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-13
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.14 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-14
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.15 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-15
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.16 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-16
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.17 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-17
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.18 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-18
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.19 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-19
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.20 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-20
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.21 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-21
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.22 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-22
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.23 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-23
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.24 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-24
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.25 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-25
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.26 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-26
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.27 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-27
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.28 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-28
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.29 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-29
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.30 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-30
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.31 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-31
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.32 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-32
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.33 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-33
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.34 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-34
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.35 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-35
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.36 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-36
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.37 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-37
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.38 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-38
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.39 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-39
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.40 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-40
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.41 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-41
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.42 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-42
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.43 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-43
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.44 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-44
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.45 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-45
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.46 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-46
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.47 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-47
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.48 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-48
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.49 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-49
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.50 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-50
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.51 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-51
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.52 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-52
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.53 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-53
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.54 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-54
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.55 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-55
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.56 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-56
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.57 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-57
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.58 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-58
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.59 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-59
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.60 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-60
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.61 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-61
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.62 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-62
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.63 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-63
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.64 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-64
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.65 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-65
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.66 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-66
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.67 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-67
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.68 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-68
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.69 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-69
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.70 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-70
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.71 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-71
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.72 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-72
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.73 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-73
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


### 5.74 Módulo Funcional de Enmask v2.0 — Especificación de Característica F-74
Este módulo constituye un pilar esencial en el ecosistema de gobernanza de datos de la plataforma Enmask.
Su función principal es interactuar de manera coordinada con los servicios de infraestructura asíncronos para asegurar la correcta ejecución del flujo de de-sensibilización de datos.

**Descripción Lógica de la Operación:**
Cuando el usuario interactúa con la interfaz web de React, se despacha una solicitud asíncrona hacia el API Gateway. Este gateway analiza la firma de seguridad (Token JWT) para verificar el rol del usuario ejecutor (Administrador o Usuario Estándar). Una vez aprobada la validación de permisos, el backend FastAPI invoca la fábrica de base de datos (`DatabaseFactory`) para iniciar una sesión de lectura asíncrona sobre la conexión seleccionada. 

Para optimizar el rendimiento y evitar bloqueos en el motor de destino, Enmask implementa un cursor de lectura paginado por lotes (con un tamaño de lote configurable en la variable de entorno `BATCH_SIZE`). Los registros se leen del origen, se transfieren a la RAM en tránsito del backend, se aplican los algoritmos de ofuscación seleccionados (como Hashing SHA-256 o Sustitución determinista con Faker) y se devuelven al frontend o se aplican físicamente según corresponda. Este flujo previene la corrupción de la base de datos y garantiza una experiencia de usuario sumamente fluida.


---

## 6. RESTRICCIONES Y REQUERIMIENTOS NO FUNCIONALES (RNF)

El sistema debe cumplir con estrictas directrices de calidad para garantizar su viabilidad en entornos corporativos:

### 6.1 RNF de Rendimiento y Escalabilidad
- **Tiempo de Respuesta de Preview:** La API debe generar previsualizaciones de hasta 100 registros en menos de 1.5 segundos para bases de datos relacionales locales.
- **Procesamiento de Jobs:** El orquestador de jobs debe poder procesar lotes de 10,000 registros por segundo bajo condiciones normales de red.
- **Consumo de Memoria:** El consumo de memoria del backend FastAPI no debe exceder de 512MB RAM en estado de reposo (idle).

### 6.2 RNF de Confiabilidad y Disponibilidad
- **Tasa de Disponibilidad:** El sistema debe mantener una tasa de disponibilidad del 99.5% anual.
- **Tolerancia a Fallos:** Ante caídas de conexión durante un job físico (`apply`), el sistema debe realizar un rollback automático de la transacción abierta en la base de datos de destino y registrar el error exacto en la bitácora SQLite de auditoría.

### 6.3 RNF de Usabilidad y Accesibilidad
- **Diseño Responsivo:** La UI React debe renderizarse de forma fluida en resoluciones desde 1280x720 píxeles.
- **Tematización:** Soporte nativo para modos Claro y Oscuro guardado en el LocalStorage del navegador para mejorar la fatiga visual del administrador.

---

## 7. ANEXOS Y ESCENARIOS DE VISIÓN ADICIONALES


### ANEXO V.01 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.01 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.02 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.02 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.03 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.03 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.04 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.04 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.05 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.05 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.06 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.06 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.07 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.07 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.08 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.08 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.09 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.09 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.10 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.10 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.11 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.11 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.12 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.12 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.13 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.13 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.14 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.14 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.15 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.15 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.16 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.16 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.17 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.17 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.18 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.18 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.19 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.19 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.20 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.20 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.21 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.21 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.22 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.22 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.23 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.23 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.24 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.24 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.25 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.25 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.26 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.26 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.27 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.27 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.28 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.28 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.29 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.29 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.30 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.30 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.31 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.31 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.32 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.32 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.33 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.33 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.34 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.34 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.35 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.35 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.36 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.36 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.37 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.37 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.38 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.38 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.39 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.39 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.40 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.40 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.41 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.41 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.42 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.42 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.43 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.43 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.44 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.44 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.45 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.45 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.46 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.46 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.47 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.47 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.48 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.48 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.49 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.49 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.50 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.50 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.51 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.51 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.52 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.52 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.53 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.53 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.54 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.54 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.55 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.55 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.56 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.56 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.57 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.57 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.58 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.58 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.


### ANEXO V.59 — DOCUMENTACIÓN COMPLEMENTARIA DE REQUERIMIENTOS DE VISIÓN
El anexo V.59 detalla los casos extremos de uso y los escenarios excepcionales que debe soportar la arquitectura de Enmask v2.0.
Se evalúa la consistencia de las llaves primarias y foráneas al enmascarar tablas con relaciones complejas de muchos a muchos. El sistema debe garantizar que si dos registros en tablas separadas comparten la misma clave externa sensible, el resultado del enmascaramiento sea idéntico para no corromper la integridad referencial. Para lograr esto, la estrategia de hashing de Enmask permite configurar una sal (salt) estática global que asegura la replicación exacta de los valores ofuscados generados en memoria, facilitando las pruebas de integraciones complejas sin exponer el dato real.
