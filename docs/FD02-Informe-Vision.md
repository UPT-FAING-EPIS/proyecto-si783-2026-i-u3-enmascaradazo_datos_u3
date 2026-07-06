# FD02 - Informe de Visión

## 1. Introducción

### 1.1 Propósito
El propósito de este documento es definir la visión general de la plataforma **Enmask v2.0**, estableciendo los objetivos estratégicos, los problemas de gobernanza de datos que resuelve y las características de alto nivel de la aplicación.

### 1.2 Alcance
El sistema proveerá capacidades automatizadas de enmascaramiento estático y dinámico para 9 motores de bases de datos. Los usuarios del sistema serán el personal de desarrollo de software, ingenieros de QA y administradores de bases de datos (DBAs) que necesiten aprovisionar datos reales pero de-sensibilizados a entornos de prueba inferiores, garantizando el cumplimiento de normativas de privacidad de datos (PII).

### 1.3 Definiciones, Siglas y Abreviaturas
- **PII:** Personally Identifiable Information (Información de Identificación Personal).
- **QA:** Quality Assurance (Aseguramiento de la Calidad).
- **Vault:** Repositorio seguro y encriptado donde se almacenan respaldos temporales de datos antes de aplicar transformaciones físicas.
- **MCP:** Model Context Protocol (Protocolo de Contexto de Modelos, integración de IA).
- **Overhead:** Retraso de rendimiento introducido por procesamiento adicional de seguridad.

---

## 2. Posicionamiento del Producto

### 2.1 Oportunidad de Negocio
Con el endurecimiento de normativas internacionales de protección de datos (como GDPR) y legislaciones nacionales (como la Ley N° 29733 en el Perú), el uso de bases de datos productivas en entornos de desarrollo está terminantemente prohibido. La oportunidad de negocio de **Enmask v2.0** radica en automatizar y centralizar este proceso de ofuscación de forma agnóstica al motor de datos, acortando tiempos de aprovisionamiento de días a minutos y anulando riesgos de sanciones legales.

### 2.2 Definición del Problema

| Aspecto | Descripción |
|---|---|
| **El problema de** | Exposición de PII sensible en entornos de desarrollo y pruebas no controlados. |
| **Afecta a** | Desarrolladores, ingenieros de QA, auditores de cumplimiento y la reputación de la organización. |
| **Cuyo impacto es** | Pérdida de confianza de clientes, robo de credenciales, y multas administrativas severas de entes reguladores. |
| **Una solución ideal** | Una plataforma centralizada y agnóstica que automatice la aplicación de reglas de protección en múltiples motores con reportes de auditoría y monitoreo de performance. |

---

## 3. Descripción de Interesados y Usuarios

### 3.1 Resumen de Interesados
- **Oficial de Seguridad de la Información (CISO):** Requiere que ningún dato sensible sin ofuscar sea expuesto en redes inferiores y exige reportes de cumplimiento e historial de auditoría inmutables.
- **Líderes de TI / Propietarios de Producto:** Buscan agilidad en la entrega de software sin comprometer los estándares de seguridad de la organización.

### 3.2 Resumen de Usuarios
- **Ingenieros de QA / Desarrolladores:** Operan el workbench interactivo para crear vistas previas rápidas y generar datos ficticios útiles en sus pruebas de integración.
- **Administradores de Bases de Datos (DBA):** Gestionan las credenciales, supervisan el impacto en el rendimiento de los servidores (overhead) y coordinan procesos de restauración de backups desde el Vault.

---

## 4. Vista General del Producto

### 4.1 Perspectiva del Producto
Enmask v2.0 es una plataforma autónoma e integrada que actúa como un puente seguro entre las bases de datos de producción y los entornos de destino de desarrollo y pruebas.

![Perspectiva de Alto Nivel de Enmask](./diagrams/fd02_vision.png)

### 4.2 Características Principales
- **Arquitectura Multimotor Agnóstica:** Un solo panel web para configurar transformaciones en PostgreSQL, MySQL, SQL Server, MongoDB, Cassandra, Redis, Neo4j, Oracle y SQLite.
- **Protección No Destructiva:** Permite crear vistas virtuales (`masked_view`) y columnas derivadas (`masked_column`) de manera que las tablas originales permanezcan intactas en demostraciones rápidas.
- **Monitoreo de Telemetría (Benchmark):** Mide y almacena cuantitativamente la latencia de las consultas antes y después de aplicar la ofuscación física para evaluar el overhead de performance.
- **Integraciones Inteligentes:** Servidor MCP de stdio listo para asistentes de IA y extensión oficial de VS Code.

---

## 5. Restricciones del Sistema
- **Restricción de Recursos:** El procesamiento por lotes pesados requiere un mínimo de 8GB de memoria RAM disponible en el contenedor FastAPI para evitar fallas del recolector de basura de Python.
- **Restricción de Conectividad:** La aplicación debe estar desplegada en una subred privada que posea reglas de enrutamiento y acceso por puertos específicos a los servidores de bases de datos.
- **Restricción de Tránsito:** Por diseño de seguridad, la plataforma nunca almacena datos reales en su almacenamiento local permanente; los datos son transmitidos en tránsito en memoria RAM y eliminados inmediatamente después de completarse el Job.
