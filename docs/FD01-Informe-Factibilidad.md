# FD01 - Informe de Factibilidad

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

## 1. INTRODUCCIÓN Y CONTEXTO DEL PROYECTO

### 1.1 Antecedentes
En el ámbito corporativo y gubernamental moderno, el activo más valioso e indispensable es la información. El almacenamiento, procesamiento e intercambio de grandes volúmenes de datos permite a las organizaciones realizar análisis estadísticos, predicciones de comportamiento de consumidores, y optimizaciones de procesos logísticos. Sin embargo, esta concentración masiva de datos también atrae el interés de ciberdelincuentes y expone a las organizaciones a incidentes de fuga de información.

La vulnerabilidad más común ocurre en los entornos no productivos de TI. Mientras que los entornos de producción están resguardados por cortafuegos robustos, cifrado de bases de datos y estrictos sistemas de control de acceso, los entornos de desarrollo, pruebas, control de calidad (QA) y analítica de datos suelen presentar políticas de seguridad mucho más relajadas. Para recrear bugs de producción, los desarrolladores y QA solicitan de forma recurrente réplicas de bases de datos reales. Hospedar datos de identificación personal (PII) reales sin ningún tipo de ofuscación en estaciones de trabajo locales de desarrolladores es una brecha crítica de seguridad.

### 1.2 Justificación del Proyecto
El proyecto **Enmask v2.0** nace como una solución directa para unificar la de-sensibilización y el enmascarado de datos multiplataforma de forma automatizada y auditable. El sistema permite:
1. Reemplazar datos reales por datos simulados sintéticos coherentes.
2. Mantener la consistencia referencial cruzada (multi-motor).
3. Evaluar el overhead o impacto en el rendimiento de los motores a través de telemetría de latencias integrada.
4. Integrar flujos de trabajo inteligentes mediante extensiones IDE y protocolos de comunicación estándar para agentes de IA (MCP).

---

## 2. MARCO TEÓRICO Y REGULACIONES DE PRIVACIDAD

### 2.1 La Ley N° 29733 (Perú)
La Ley N° 29733, Ley de Protección de Datos Personales del Perú, tiene por objeto garantizar el derecho fundamental a la protección de los datos personales, a través de su adecuado tratamiento. La ley establece obligaciones severas para los titulares de bancos de datos personales, incluyendo:
- **Principio de seguridad:** El titular del banco de datos personales debe adoptar las medidas técnicas, organizativas y legales necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizado.
- **Principio de proporcionalidad:** Todo tratamiento de datos personales debe ser adecuado, relevante y no excesivo en relación con el ámbito y las finalidades determinadas para las que se obtuvieron.
- Las multas por infracciones muy graves pueden ascender hasta las 100 UIT (Unidades Impositivas Tributarias), lo que representa un impacto financiero devastador para cualquier organización.

### 2.2 Reglamento General de Protección de Datos (GDPR)
A nivel internacional, el GDPR de la Unión Europea es la norma de referencia. Establece el principio de "Privacidad por Diseño y por Defecto", lo que obliga a las empresas a incorporar mecanismos de anonimización y seudonimización en el ciclo de vida del desarrollo de software.

### 2.3 Estándares de la Industria (PCI-DSS)
Para organizaciones que manejan transacciones con tarjetas de pago, el estándar PCI-DSS exige estrictamente la redacción o el cifrado de los números de cuenta primaria (PAN). Ningún número de tarjeta debe mostrarse en texto plano en logs ni base de datos de pruebas.

---

## 3. IDENTIFICACIÓN Y ANÁLISIS DE RIESGOS (MATRIZ COMPLETA)

A continuación se detalla la matriz de riesgos del proyecto Enmask v2.0, analizando probabilidad (P) de 1 a 5, impacto (I) de 1 a 5, y el nivel de riesgo final (R = P * I).


### 3.1 Tabla de Matriz de Riesgos

| ID | Riesgo | Categoría | P | I | R | Plan de Mitigación |
|---|---|---|---|---|---|---|
| R-01 | Exposición de credenciales de DB productivas | Seguridad | 1 | 5 | 5 | Cifrado simétrico AES-256 en reposo (Fernet) de los strings de conexión. |
| R-02 | Fuga de datos de RAM en el backend | Seguridad | 1 | 4 | 4 | Limpieza explícita de buffers en memoria al finalizar consultas. |
| R-03 | Caída de rendimiento del servidor por queries pesadas | Rendimiento | 3 | 4 | 12 | Implementación de procesamiento paginado y por lotes (batching). |
| R-04 | Incompatibilidad con drivers ODBC antiguos de SQL Server | Técnico | 3 | 3 | 9 | Dockerización del backend incluyendo todas las librerías necesarias. |
| R-05 | Inconsistencia referencial entre tablas relacionales | Técnico | 2 | 4 | 8 | Soporte de hashing con sal estática común para conservar correlaciones. |
| R-06 | Resistencia de los desarrolladores al uso del sistema | Operacional | 3 | 3 | 9 | Creación de extensión VS Code para simplificar la integración en el IDE. |
| R-07 | Lentitud excesiva en motores NoSQL masivos | Rendimiento | 3 | 3 | 9 | Permitir el uso de vistas virtuales dinámicas sin alteración física. |
| R-08 | Cambios inesperados de esquema DDL en las DB origen | Operacional | 2 | 3 | 6 | Validación y actualización de esquemas antes de ejecutar tareas. |
| R-09 | Pérdida de datos originales por falta de backup | Técnico | 1 | 5 | 5 | Creación automática de copia cifrada en Vault previo a enmascaramiento estático. |
| R-10 | Desbordamiento de la base de datos de metadatos | Técnico | 2 | 2 | 4 | Purga periódica y automática de históricos de logs de auditoría viejos. |
| R-11 | Vulnerabilidad ante inyecciones de código malicioso | Seguridad | 1 | 5 | 5 | Sanitización estricta y parametrización de consultas generadas dinámicamente. |
| R-12 | Error de timeout al conectar con bases de datos en nube | Técnico | 3 | 2 | 6 | Configuración de timeouts cortos (5s) y reintentos automáticos. |
| R-13 | Falta de soporte de tipos complejos en Oracle Database | Técnico | 2 | 3 | 6 | Conversión implícita de tipos LOB a strings en el adaptador. |
| R-14 | Elevada curva de aprendizaje para configurar reglas | Operacional | 2 | 3 | 6 | Creación de plantillas de enmascaramiento preconfiguradas para PII común. |
| R-15 | Falta de sincronización horaria en logs de auditoría | Operacional | 2 | 2 | 4 | Sincronización obligatoria mediante NTP y guardado en UTC. |
| R-16 | Fallo en la API externa de Kroki para gráficos | Técnico | 2 | 3 | 6 | Implementación de fallback local con generación de gráficos HTML. |
| R-17 | Incompatibilidad del servidor MCP con versiones de Node | Técnico | 2 | 2 | 4 | Congelar dependencias del servidor en el archivo package.json. |
| R-18 | Filtración de datos sensibles a través de logs internos | Seguridad | 1 | 4 | 4 | Bloqueo absoluto de impresión de payloads de datos en el logger. |
| R-19 | Inconsistencia en motores de grafo Neo4j | Técnico | 2 | 3 | 6 | Mapeo separado de propiedades de nodos y relaciones. |
| R-20 | Exceso de coste operativo en almacenamiento local | Operacional | 2 | 2 | 4 | Soporte de compresión gzip sobre los backups del Vault. |




---

## 4. ANÁLISIS DE FACTIBILIDAD TÉCNICA

### 4.1 Infraestructura de Servidores y Red
La factibilidad técnica del sistema se sustenta sobre una arquitectura basada en contenedores ligeros que interactúan de forma eficiente. A continuación, se detallan los requisitos técnicos del entorno de ejecución:

- **Sistema Operativo del Servidor:** Linux (Ubuntu 22.04 LTS o superior) / Windows Server 2022.
- **Procesador:** Mínimo 4 núcleos físicos vCPU (Intel Xeon / AMD EPYC o equivalente).
- **Memoria RAM:** Mínimo 8 GB, recomendado 16 GB DDR4 para procesamiento en lotes paralelos.
- **Almacenamiento:** 100 GB SSD con tasa de transferencia superior a 500 MB/s.
- **Red:** Conexión de red de 1 Gbps con acceso a través de túneles VPN dedicados a las bases de datos de origen.

### 4.2 Matriz de Drivers y Bibliotecas del Backend (FastAPI)
Para interactuar de forma nativa con los 9 motores de bases de datos, Enmask v2.0 utiliza bibliotecas maduras y optimizadas:

| Motor | Librería Python | Tipo de Conexión | Protocolo |
|---|---|---|---|
| PostgreSQL | `asyncpg` | Asíncrono nativo | TCP/IP |
| MySQL / MariaDB | `aiomysql` | Asíncrono nativo | TCP/IP |
| SQLite | `aiosqlite` | Asíncrono nativo | Archivo Local |
| SQL Server | `pymssql` | Síncrono / Thread Pool | TDS |
| Oracle Database | `oracledb` | Síncrono / Thread Pool | Oracle Net |
| MongoDB | `motor` | Asíncrono nativo | MongoDB Wire |
| Redis | `redis-py` | Asíncrono nativo | RESP |
| Apache Cassandra | `cassandra-driver` | Síncrono / Thread Pool | CQL Native |
| Neo4j | `neo4j` | Síncrono / Thread Pool | Bolt |

### 4.3 Arquitectura de Controladores y Acceso a Base de Datos
El backend de Enmask v2.0 delega la creación de instancias de base de datos a una fábrica (`DatabaseFactory`) que resuelve dinámicamente qué driver utilizar a partir del tipo de conexión guardado en la base de datos de metadatos. Esta separación de responsabilidades asegura que agregar soporte para nuevos motores sea tan simple como agregar una clase que herede de la interfaz abstracta `BaseDeDatos` e implementar sus métodos virtuales.

---

## 5. ANÁLISIS DE FACTIBILIDAD ECONÓMICA

El análisis económico de Enmask v2.0 evalúa los costos asociados al desarrollo, despliegue e infraestructura frente a los retornos financieros derivados de la optimización del tiempo de desarrollo, la prevención de multas legales por fugas de datos y la eliminación de licencias de herramientas privativas de terceros.

### 5.1 Estimación de Costos de Desarrollo (CAPEX)

| Concepto / Recurso | Horas Estimadas | Tarifa por Hora (USD) | Costo Total (USD) |
|---|---|---|---|
| Arquitecto de Software / Lead Backend | 160 | $40 | $6,400 |
| Desarrollador Frontend (React/TS) | 160 | $30 | $4,800 |
| Ingeniero de QA / DevOps | 120 | $30 | $3,600 |
| Hosting y Servidores Cloud de Prueba | — | — | $2,000 |
| Licenciamiento de herramientas de análisis | — | — | $700 |
| **Total Inversión Inicial (CAPEX)** | **440** | **—** | **$17,500** |

### 5.2 Costos Operativos Anuales (OPEX)

| Concepto | Costo Mensual (USD) | Costo Anual (USD) |
|---|---|---|
| Servidor de Producción / Staging (Render/AWS) | $150 | $1,800 |
| Soporte Técnico y Mantenimiento Correctivo | $100 | $1,200 |
| Certificados SSL y Seguridad Cloudflare | $40 | $500 |
| **Total Costo Operativo (OPEX)** | **$290** | **$3,500** |

### 5.3 Proyecciones de Retorno de Inversión (Flujo de Caja a 5 Años)

A continuación, se detalla la proyección financiera a 5 años considerando un ahorro anual recurrente de $45,000 USD por productividad de TI y mitigación del riesgo de multas legales.


| Año | CAPEX (USD) | OPEX (USD) | Beneficio Bruto (USD) | Flujo Neto (USD) | Flujo Acumulado (USD) |
|---|---|---|---|---|---|
| Año 0 | -$17,500 | $0 | $0 | -$17,500 | -$17,500 |
| Año 1 | $0 | -$3,500 | $45,000 | $41,500 | $24,000 |
| Año 2 | $0 | -$3,500 | $47,250 | $43,750 | $67,750 |
| Año 3 | $0 | -$3,500 | $49,612 | $46,112 | $113,862 |
| Año 4 | $0 | -$3,500 | $52,093 | $48,593 | $162,455 |
| Año 5 | $0 | -$3,500 | $54,697 | $51,197 | $213,652 |

### 5.4 Evaluación de Indicadores Financieros
- **VAN (Valor Actual Neto) con tasa de descuento del 10%:** $145,210 USD (Altamente favorable).
- **TIR (Tasa Interna de Retorno):** 234% (Representa un retorno de inversión extremadamente veloz y rentable).
- **Payback Period (Período de Recuperación):** 6 meses.

---

## 6. ANÁLISIS DE FACTIBILIDAD LEGAL

El cumplimiento normativo es el motor principal detrás de la justificación de Enmask v2.0. El tratamiento inseguro de bases de datos de prueba vulnera leyes de privacidad locales y globales.

### 6.1 Cumplimiento de la Ley N° 29733 (Perú)
La plataforma ayuda a las organizaciones a cumplir con las exigencias de la Dirección de Protección de Datos Personales de Perú:
1. **Anonimización y Disasociación:** El uso de la estrategia de sustitución con Faker rompe el nexo de identidad entre el titular y el dato personal.
2. **Seguridad Organizativa:** Los accesos a las conexiones del sistema están protegidos por tokens JWT firmados, y las contraseñas se almacenan con hashing Bcrypt.
3. **Auditoría de Tratamiento:** Los jobs de enmascaramiento guardan logs detallados de la fecha, usuario ejecutor, motor afectado y campos alterados, sirviendo como evidencia de auditoría ante inspecciones de la autoridad fiscalizadora.

### 6.2 Cumplimiento del GDPR (Europa)
Para organizaciones con presencia global o clientes europeos, Enmask v2.0 asegura la conformidad con los artículos de privacidad desde el diseño:
- **Seudonimización (Art. 32):** El cifrado reversible con Fernet de Enmask permite la manipulación de datos seudonimizados de forma segura.
- **Minimización de datos (Art. 5):** Limita la visibilidad de datos sensibles en el frontend a través del enmascaramiento dinámico (vistas virtuales).

---

## 7. ANÁLISIS DE FACTIBILIDAD SOCIAL Y ORGANIZACIONAL

### 7.1 Impacto en la Productividad del Desarrollador
La automatización del enmascarado reduce los cuellos de botella burocráticos. En lugar de esperar días para recibir una base de datos segura y limpia de-sensibilizada por el DBA, los desarrolladores y QA pueden solicitar y aprovisionar copias seguras de forma autónoma desde el frontend web de Enmask o directamente desde su editor de código a través de la extensión de VS Code.

### 7.2 Cultura de Seguridad Integrada (SecOps)
Enmask fomenta la incorporación del rol de seguridad en las etapas iniciales de la ingeniería de software (DevSecOps). La seguridad deja de ser una traba de última hora y se convierte en una propiedad integrada por defecto en el pipeline de desarrollo.

---

## 8. ANÁLISIS DE FACTIBILIDAD AMBIENTAL Y ECO-EFICIENCIA

### 8.1 Reducción de la Huella de Carbono Digital
El procesamiento clásico de enmascaramiento mediante scripts SQL complejos ineficientes obliga a los servidores de bases de datos a trabajar a su máxima capacidad durante horas. Enmask v2.0 implementa procesamiento en memoria optimizado por lotes y promueve el uso de vistas dinámicas virtuales. Al reducir las transferencias masivas de datos por red y optimizar los ciclos de CPU, el consumo energético de la infraestructura se reduce significativamente.

### 8.2 Optimización de Recursos de Almacenamiento
En lugar de duplicar gigabytes de bases de datos para crear entornos de prueba seguros, Enmask permite generar vistas dinámicas. Esto ahorra espacio físico en los discos SSD de los servidores de pruebas, reduciendo la necesidad de comprar hardware de almacenamiento adicional y mitigando el impacto de desechos tecnológicos.

---

## 9. CONCLUSIONES Y RECOMENDACIONES

### 9.1 Conclusiones
El proyecto **Enmask v2.0** presenta una viabilidad excelente en todas sus dimensiones. Resuelve un problema de cumplimiento legal y operacional crítico con costos mínimos, alta rentabilidad y un stack tecnológico escalable, asíncrono y multiplataforma.

### 9.2 Recomendaciones
1. **Despliegue Dockerizado:** Utilizar el archivo docker-compose provisto para asegurar un entorno de ejecución limpio e idéntico al de desarrollo.
2. **Uso Prioritario de Vistas:** Para bases de datos gigantes, priorizar el modo `masked_view` frente a la modificación física destructiva para evitar saturaciones de CPU.
3. **Claves Maestras Seguras:** Resguardar de forma segura la variable de entorno `ENMASK_MASTER_KEY` fuera de repositorios git públicos.



