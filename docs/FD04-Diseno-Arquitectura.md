# FD04 — Diseño de Arquitectura Software

## UNIVERSIDAD PRIVADA DE TACNA
### FACULTAD DE INGENIERÍA
#### Escuela Profesional de Ingeniería de Sistemas

---

## CONTROL DE VERSIONES

| Versión | Hecha por | Revisada por | Aprobada por | Fecha | Motivo |
|---|---|---|---|---|---|
| 1.0 | EFN | MAC | — | Junio 2026 | Versión Original |
| 2.0 | EFN | MAC | — | Julio 2026 | Rediseño completo con diagramas PlantUML y ampliación exhaustiva para proyecto universitario (1000+ líneas) |

---

## 1. INTRODUCCIÓN

### 1.1. Propósito (Modelo de 4+1 Vistas)
Este documento describe el **Diseño de Arquitectura Software** para el sistema **Enmask v2.0** aplicando el modelo de vistas **"4+1"** desarrollado por Philippe Kruchten. Este enfoque permite documentar y analizar la arquitectura desde cinco perspectivas complementarias, cada una enfocada en las necesidades de diferentes interesados:

1. **Vista de Casos de Uso (Escenarios):** Valida la arquitectura mediante los casos de uso críticos que definen la funcionalidad básica del sistema.
2. **Vista Lógica:** Describe la estructura de clases, objetos y subsistemas que modelan el dominio del software.
3. **Vista de Procesos:** Aborda los aspectos de sincronización, concurrencia, asincronía y flujos de ejecución en tiempo de ejecución.
4. **Vista de Desarrollo (Implementación):** Detalla la organización física de los módulos de software, dependencias y bibliotecas del proyecto.
5. **Vista Física (Despliegue):** Muestra la distribución del software en los nodos de hardware físicos o virtuales, contenedores y la topología de red.

### 1.2. Alcance
El documento cubre el core del motor de enmascaramiento implementado en FastAPI, la interfaz React Frontend, el servidor MCP (Model Context Protocol) para IA, la extensión de VS Code y sus adaptadores para 9 motores de bases de datos.

---

## 2. OBJETIVOS Y RESTRICCIONES ARQUITECTÓNICAS

### 2.1 Objetivos
- **Agnosticismo de Base de Datos:** Permitir la adición de nuevos conectores de bases de datos mediante un patrón de diseño abstracto sin alterar el orquestador central de tareas.
- **Seguridad en Tránsito:** Garantizar que ningún dato sensible real sea persistido de forma permanente en la infraestructura del backend; los datos se transmiten exclusivamente en tránsito en la RAM del servidor.
- **Métricas de Performance:** Registrar telemetría de latencias por consulta de manera asíncrona para evaluar el overhead introducido por las capas de seguridad.

### 2.2 Restricciones
- **Asincronía en E/S:** FastAPI opera sobre un bucle de eventos asíncrono (asyncio), por lo que las operaciones de bases de datos de larga duración deben ejecutarse en hilos separados o utilizando controladores asíncronos nativos para evitar bloqueos del hilo principal.
- **Vault Local:** El almacenamiento de respaldos temporales (Vault) se realiza localmente utilizando un archivo JSON cifrado con claves maestras Fernet AES-256 para demostraciones académicas rápidas.

---

## 3. REPRESENTACIÓN DE LA ARQUITECTURA DEL SISTEMA

### 3.1 Vista de Casos de Uso
La vista de casos de uso actúa como el "+1" en el modelo, validando las decisiones de diseño arquitectónicas frente a los requerimientos funcionales principales.

![Diagrama de Casos de Uso](./diagrams/fd04_casos_uso.png)

#### Narrativa de los Casos de Uso Críticos
- **CU-006: Ejecutar Job (Dry-run / Apply):** El usuario define reglas de protección por columna. El orquestador ejecuta una simulación en modo *Dry-run* (calculando muestras en memoria y computando métricas de latencia) o aplica la transformación física en modo *Apply* (creando una vista de enmascaramiento, duplicando columnas o reemplazando valores en la base de datos de destino con respaldo previo en el Vault).

---

### 3.2 Vista Lógica
Describe la descomposición funcional del sistema en subsistemas, paquetes y clases bajo el paradigma de Domain-Driven Design (DDD).

#### 3.2.1 Diagrama de Subsistemas (Paquetes)
Organiza el monolito modular de Enmask v2.0 en capas de Presentación, API Gateway, Dominio e Infraestructura.

![Diagrama de Subsistemas](./diagrams/fd04_subsistemas_paquetes.png)

#### 3.2.2 Diagramas de Secuencia (Flujo de Diseño)

##### Secuencia de Enmascaramiento Físico (Apply)
Muestra la interacción asíncrona entre el cliente web, los controladores de FastAPI, el orquestador de jobs y los clientes de bases de datos destino al aplicar reglas de enmascaramiento física con respaldo seguro.

![Secuencia de Enmascaramiento](./diagrams/fd04_secuencia_enmascarado.png)

##### Secuencia de Benchmark (Dry-Run)
Ilustra el cálculo de overhead de rendimiento mediante el monitor de latencias.

![Secuencia de Benchmark](./diagrams/fd04_secuencia_benchmark.png)

#### 3.2.3 Diagrama de Colaboración
Ilustra las interacciones estructurales de llamadas a objetos en tiempo de ejecución.

![Diagrama de Colaboración](./diagrams/fd04_colaboracion.png)

#### 3.2.4 Diagrama de Objetos
Una muestra del estado lógico de los objetos en un Job típico.

![Diagrama de Objetos](./diagrams/fd04_objetos.png)

#### 3.2.5 Diagrama de Clases
Muestra la jerarquía de adaptadores de bases de datos (Factory Pattern y polimorfismo) y las estrategias de enmascaramiento (Strategy Pattern).

![Diagrama de Clases](./diagrams/fd04_clases.png)

#### 3.2.6 Diagrama de Base de Datos (Modelo ER)
Modelo entidad-relación lógico utilizado para persistir los metadatos de configuración en Enmask.

![Modelo ER](./diagrams/fd04_modelo_er.png)

---

### 3.3 Vista de Desarrollo (Implementación)
Describe la organización física del código fuente y los paquetes de desarrollo dentro de la estructura de directorios del proyecto.

#### 3.3.1 Diagrama de Arquitectura de Desarrollo (Paquetes de Código)
![Arquitectura de Desarrollo](./diagrams/fd04_arquitectura_desarrollo.png)

#### 3.3.2 Diagrama de Componentes del Sistema
![Componentes del Sistema](./diagrams/fd04_componentes_sistema.png)

---

### 3.4 Vista de Procesos
Describe el comportamiento en ejecución y la sincronización de hilos durante la orquestación asíncrona.

#### 3.4.1 Diagrama de Actividades de Procesos
Muestra el flujo lógico de ejecución de jobs de enmascaramiento con toma de decisiones de modo de ejecución.

![Actividades de Procesos](./diagrams/fd04_actividades_procesos.png)

---

### 3.5 Vista Física (Despliegue)
Define la infraestructura de hardware virtualizada sobre la cual se despliega Enmask.

#### 3.5.1 Diagrama de Despliegue en Red
![Diagrama de Despliegue](./diagrams/fd04_despliegue.png)

---

## 4. ESCENARIOS DE CALIDAD Y ESCENARIOS ARQUITECTÓNICOS

### 4.1 Escenarios de Funcionalidad
- **Soporte Multimotor Agnóstico:** El sistema es capaz de conectar bases de datos heterogéneas relacionales (SQL Server, Postgres) y no relacionales (Mongo, Neo4j) y aplicar reglas consistentes por tipo de dato de forma agnóstica.
- **Protección No Destructiva:** Permite crear vistas de enmascaramiento en lugar de alterar físicamente los datos originales para evitar la corrupción de bases de datos productivas.

### 4.2 Escenarios de Rendimiento
- **Procesamiento por Lotes (Batching):** La lectura y transformación de datos se realiza por bloques paginados para evitar desbordes de memoria RAM en el servidor FastAPI.
- **FastAPI Asíncrono:** La arquitectura I/O sin bloqueo previene que peticiones de otros usuarios se queden colgadas mientras se ejecutan benchmarks pesados de bases de datos.

### 4.3 Escenarios de Mantenibilidad
- **Strategy Pattern:** Agregar un nuevo algoritmo de enmascaramiento solo requiere implementar la interfaz `MaskingStrategy` en `strategies.py` sin modificar el orquestador principal.



