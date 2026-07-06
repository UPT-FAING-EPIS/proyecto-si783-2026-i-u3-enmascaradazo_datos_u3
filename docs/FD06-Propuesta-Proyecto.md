# FD06 - Propuesta de Proyecto

## UNIVERSIDAD PRIVADA DE TACNA
### FACULTAD DE INGENIERÍA
#### Escuela Profesional de Ingeniería de Sistemas

---

## CONTROL DE VERSIONES

| Versión | Hecha por | Revisada por | Aprobada por | Fecha | Motivo |
|---|---|---|---|---|---|
| 1.0 | EFN | MAC | — | Junio 2026 | Versión Original |
| 2.0 | EFN | MAC | — | Julio 2026 |  |

---

## 1. Resumen Ejecutivo
Esta propuesta describe el plan de desarrollo de la plataforma **Enmask v2.0**, una solución integrada orientada a la gobernanza y protección de datos que se conecta de forma agnóstica a 9 motores de bases de datos para automatizar el enmascarado y cifrado de Información Personal Identificable (PII) en entornos no productivos de desarrollo y pruebas.

---

## 2. Propuesta Narrativa

### 2.1 Planteamiento del Problema
La exposición involuntaria de datos sensibles (PII) en entornos locales de desarrollo es uno de los mayores vectores de incidentes y multas legales a nivel corporativo. Las empresas tradicionales aprovisionan datos para pruebas mediante scripts SQL manuales, lo que introduce inconsistencias en las llaves foráneas y retrasos significativos.

### 2.2 Justificación del Proyecto
Enmask v2.0 proporciona un panel SecOps centralizado que automatiza la creación de vistas lógicas, duplicación de columnas u ofuscación física destructiva con respaldos seguros en un Vault local. La propuesta se fundamenta en la integración de un módulo de telemetría que computa el overhead de rendimiento sobre cada consulta, asegurando que las reglas de protección sean eficientes.

### 2.3 Objetivos
- **Objetivo General:** Desarrollar e implementar la plataforma Enmask v2.0 compatible con bases de datos relacionales y NoSQL, con monitor de rendimiento y reportes de auditoría integrados.
- **Objetivos Específicos:**
  - Implementar adaptadores polimórficos de bases de datos mediante el patrón Factory.
  - Habilitar 6 estrategias avanzadas de ofuscación de datos.
  - Desarrollar la extensión oficial para VS Code y el servidor MCP de asistencia inteligente.

### 2.2 Beneficios Proyectados
- **Cumplimiento Legal (100%):** Mitigación absoluta de multas de la Autoridad Nacional de Protección de Datos Personales (APDP de Perú) al cumplir con la Ley N° 29733.
- **Reducción de Tiempos Operacionales (95%):** El aprovisionamiento de datos para entornos inferiores pasa de requerir días de trabajo de un DBA a completarse en pocos minutos desde el panel web.
- **Seguridad en Tránsito:** Ningún dato real es almacenado de forma insegura; el enmascaramiento se realiza al vuelo en la RAM.

---

## 3. Plan de Sprints y Gantt
El proyecto se desarrollará a lo largo de **16 semanas**, divididas en 5 fases de hitos clave:

![Cronograma de Implementación](./diagrams/fd06_gantt.png)

### 3.1 Hitos y Entregables del Proyecto
- **Semana 2 (Hito 1):** Aprobación del diseño funcional y SRS (documentos FD01 a FD03 completados).
- **Semana 6 (Hito 2):** Core Engine asíncrono y drivers PostgreSQL, MySQL y SQLite funcionales.
- **Semana 10 (Hito 3):** Conexión de drivers NoSQL (Mongo, Redis, Cassandra, Neo4j) y frontend workbench funcional en React.
- **Semana 14 (Hito 4):** Implementación de Vault cifrado, extensión VS Code y servidor stdio MCP integrado con Claude Desktop.
- **Semana 16 (Hito 5):** Pruebas de aceptación finales con docker-compose y entrega de documentación.

---

## 4. Presupuesto y Proyecciones Financieras

### 4.1 Estimación de Costos (USD)

| Concepto | Tipo | Costo Estimado |
|---|---|---|
| Desarrollador Lead Backend (4 meses) | Personal | $6,000 |
| Desarrollador Frontend React (4 meses) | Personal | $5,000 |
| Ingeniero de QA / DevOps (4 meses) | Personal | $4,000 |
| Hosting y Servidores Cloud de Prueba | Infraestructura | $2,000 |
| Licenciamiento de herramientas de análisis | Licencias | $500 |
| **Total General** | **Presupuesto** | **$17,500** |

### 4.2 Proyección del Retorno de Inversión (Payback)
- **Costo Operativo de Procesos Manuales Actuales:** $3,750 USD mensuales (horas de desarrollo dedicadas a scripts).
- **Costo Operativo con Enmask v2.0:** $300 USD mensuales (mantenimiento y cloud loggers).
- **Ahorro Mensual Estimado:** $3,450 USD.
- **Payback Period:** **6 meses** (la inversión inicial de $17,500 se recupera por completo al sexto mes de operación debido a la optimización de procesos y productividad).
- **VAN (Valor Actual Neto) Proyectado a 3 Años:** Positivo, sustentando la viabilidad económica.
- **TIR (Tasa Interna de Retorno):** 35%.

---


