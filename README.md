# Enmask — Plataforma de enmascaramiento de datos

### Conexiones por URI completa o campos separados

Enmask permite registrar conexiones de dos formas:

- Campos separados: host, puerto, base, usuario y contraseña.
- URI completa copiada del proveedor cloud: Supabase, MongoDB Atlas, Redis Cloud, Neo4j Aura, SQL Server, etc.

Ejemplos soportados:

```text
postgresql://postgres:clave@db.xxxxx.supabase.co:5432/postgres?sslmode=require
mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net/enmask_db
redis://:clave@localhost:6379/0
neo4j+s://neo4j:clave@xxxx.databases.neo4j.io:7687/neo4j
```

Cuando se pega una URI con credenciales, el backend extrae usuario/contraseña y guarda el host limpio para no exponer secretos en la interfaz. Más detalle: `docs/PLAN_SENIOR_CONEXIONES_URI_FLEXIBLES.md`.


Enmask es una aplicación académica para registrar conexiones a bases de datos, definir reglas de enmascaramiento y ejecutar jobs de protección sobre datos sensibles.

El proyecto usa:

- **Backend:** FastAPI + Python.
- **Frontend:** React + Vite + TypeScript.
- **Metadatos:** memoria en local o MongoDB/PostgreSQL según configuración.

## Motores soportados en esta versión

| Tipo | Motor | Puerto por defecto | Estado | Observación |
|------|-------|--------------------|--------|-------------|
| Relacional | PostgreSQL | 5432 | Soportado | Usa `asyncpg`. |
| Relacional | MySQL | 3306 | Soportado | Usa `aiomysql`. |
| Relacional | MariaDB | 3306 | Soportado | Reutiliza el cliente MySQL. |
| Relacional local | SQLite | No usa puerto | Soportado | Para pruebas locales con archivo `.db`. |
| Relacional | SQL Server | 1433 | Soportado | Requiere Microsoft ODBC Driver 18. |
| Relacional | Oracle Database | 1521 | Soportado | Usa `python-oracledb`; el campo database es service name/SID. |
| NoSQL wide-column | Apache Cassandra | 9042 | Soportado | Usa keyspace como database; las vistas se manejan como virtuales. |
| NoSQL documental | MongoDB | 27017 | Soportado | También acepta URI `mongodb://` o `mongodb+srv://`. |
| NoSQL clave-valor | Redis | 6379 | Soportado | `database` representa el índice lógico DB, por ejemplo `0`. |
| NoSQL grafo | Neo4j | 7687 | Soportado | Usa Bolt; reglas con `graph_element=node/relationship`, `target_table=label/tipo` y `target_column=propiedad`. |

Los puertos son los valores estándar de instalación. Que sean correctos no garantiza conexión automática: el motor debe estar iniciado, el puerto debe estar expuesto en firewall/red, el usuario debe tener permisos y, en SQL Server/Oracle, deben existir los drivers del sistema.

El punto de extensión principal es `backend/app/infrastructure/db/factory.py` junto con un cliente en `backend/app/infrastructure/db/`.


## Autenticación local y roles

El login ya soporta dos mecanismos:

- **Cuenta local:** registro con nombre, correo y contraseña.
- **Google institucional:** opcional; se activa al configurar `VITE_GOOGLE_CLIENT_ID` en frontend y `GOOGLE_CLIENT_ID` en backend.

Para crear una cuenta local, entra a `http://localhost:5173/login`, cambia a **Crear cuenta** y registra un usuario.

La contraseña debe cumplir una regla básica de seguridad: mínimo 8 caracteres, al menos una letra y al menos un número. El backend guarda la contraseña como hash con bcrypt; nunca se devuelve al frontend.

### Rol administrador

El rol `admin` no se asigna desde la pantalla de registro para evitar autoescalamiento de privilegios. Se define desde el archivo `backend/.env` con la variable:

```env
ADMIN_EMAILS=admin@demo.com
```

Después de cambiar esa variable, reinicia el backend. Cuando ese correo inicie sesión o se registre, el backend lo resolverá como administrador.

El administrador tiene acceso adicional al módulo **Admin**, donde puede revisar usuarios registrados y auditar quién tiene rol privilegiado. La base está lista para ampliar permisos administrativos como gestión global de conexiones, revisión de jobs de todos los usuarios, auditoría completa y gobierno de llaves de cifrado.

En modo local con `REPOSITORY_BACKEND=memory`, los usuarios se pierden al reiniciar el backend. Para persistencia real se debe usar `REPOSITORY_BACKEND=mongodb` o ampliar el repositorio PostgreSQL para usuarios.

## Dashboard renovado

El panel principal fue reorganizado como tablero ejecutivo para demostrar el estado real del sistema en localhost:

- métricas generales de conexiones, reglas, jobs y registros procesados;
- gráfico de conexiones por motor de base de datos;
- gráfico de estado de jobs;
- distribución por modo de protección;
- familias de motores registradas;
- conexiones recientes y últimos jobs;
- flujo recomendado: conexión → regla → dry-run → apply/unmask.

Los gráficos usan React + TypeScript + CSS puro, sin agregar librerías externas.

## Modelo de protección de datos

El proyecto ahora separa dos niveles, tal como se explicó en la revisión del docente.

### Nivel 1: enmascaramiento no destructivo

La data original permanece intacta. El sistema puede crear una vista, una columna/campo derivado o aplicar la máscara solo al consultar.

| Modo de regla | Qué hace | Desenmascaramiento |
|------|----------|--------|
| `virtual_view` | No modifica la base; enmascara solo la respuesta del backend. | No requiere acción física. |
| `masked_view` | Crea una vista SQL/view collection cuando el motor lo permite; en Redis, Neo4j y Cassandra se registra como vista virtual de Enmask. | Elimina la vista/artefacto generado. |
| `masked_column` | Agrega una columna/campo nuevo como `dni_masked`. | Elimina la columna/campo derivado. |
| `static_mask` | Reemplaza físicamente el dato original y guarda backup en vault. | Restaura desde vault. |

### Nivel 2: encriptación simétrica

| Modo de regla | Qué hace | Desenmascaramiento |
|------|----------|--------|
| `symmetric_encryption` | Cifra la columna original con `ENMASK_MASTER_KEY`. | Restaura desde vault o descifra con la misma llave. |

### Modos de ejecución del job

| Modo de job | Qué hace |
|------|----------|
| `dry_run` | Calcula una muestra sin tocar la base. |
| `apply` | Ejecuta el modo definido en cada regla: vista, columna derivada, máscara física o encriptación. |

La recomendación es ejecutar primero `dry_run`, revisar la muestra y recién después ejecutar `apply`. Para una demo académica, el flujo más seguro es `masked_view` o `masked_column`, porque no destruye la información original.

## Estrategias disponibles

- `substitution`: reemplazo determinista con Faker.
- `hashing`: SHA-256 con sal opcional.
- `redaction`: reemplazo por caracteres de máscara.
- `nullification`: reemplazo por `NULL`.
- `fpe`: conservación parcial de formato.
- `perturbation`: variación numérica o de fechas.

## Ejecutar en localhost

Consulta también `docs/EJECUCION_LOCAL_VSCODE.md` para la guía paso a paso en Visual Studio Code.


### Requisitos

| Herramienta | Versión recomendada |
|-------------|---------------------|
| Python | 3.12+ |
| Node.js | 20+ |
| npm | 9+ |

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Rutas principales:

- API: `http://localhost:8000/api/v1`
- Swagger: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Frontend

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

Interfaz: `http://localhost:5173`

## Flujo básico de uso

1. **Connections:** registra una conexión PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle, Cassandra, MongoDB, Redis o Neo4j.
2. **Masking Rules:** define tabla/colección o, en Neo4j, label/tipo de relación; luego indica columna/campo/propiedad, estrategia y modo de protección.
3. **Jobs:** crea un job en modo `dry_run` o `apply`.
4. **Query:** revisa datos con enmascaramiento controlado por permisos.
5. **Unmask:** elimina vistas/columnas derivadas, restaura datos o desencripta según corresponda.

## Ejemplo PostgreSQL

```sql
CREATE DATABASE masking_demo;
\c masking_demo

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT
);

INSERT INTO users (name, email, phone, address) VALUES
  ('Alice Smith', 'alice@example.com', '+1-555-0100', '123 Maple St');
```

Conexión:

```text
Tipo: postgres
Host: localhost
Puerto: 5432
Base: masking_demo
Usuario: postgres
Contraseña: la tuya
```

## Ejemplo SQLite

Para SQLite, el campo **database** debe contener la ruta del archivo:

```text
Tipo: sqlite
Host: local-file
Puerto: 0
Base: C:/ruta/masking_demo.db
Usuario: vacío
Contraseña: vacío
```


## Nota específica para Neo4j

Neo4j se maneja como grafo, no como tabla. En reglas de Neo4j:

- `graph_element=node`: protege una propiedad de nodos con un label específico.
- `graph_element=relationship`: protege una propiedad de relaciones con un tipo específico.
- `masked_view` no crea una vista SQL nativa; genera una vista virtual desde Enmask.
- `masked_column` crea una propiedad derivada persistente, por ejemplo `dni_masked`, sin alterar `dni`.

El detalle técnico está en `docs/PLAN_SENIOR_NEO4J_GRAFOS.md`.

## Seguridad aplicada en esta limpieza

- El backend ya no devuelve el password de conexiones en `ConnectionResponse`.
- Se eliminan archivos `.env` reales del repositorio; solo quedan `.env.example`.
- Se agregó `.gitignore` real.
- Se eliminan pruebas sueltas con credenciales reales.
- Los nombres de tabla y columna se validan y se escapan antes de generar SQL.
- Usuarios compartidos no pueden forzar `mask=false`; el backend siempre les entrega datos enmascarados.
- Se agrega rol `admin` por variable `ADMIN_EMAILS`.
- Se agrega `ENMASK_MASTER_KEY` para cifrado reversible con llave simétrica.
- Los jobs registran `generated_artifacts` para saber qué vista, columna o campo creó el proceso.

## Pruebas

Desde `backend`:

```powershell
$env:PYTHONPATH='.'
pytest -q
```

Resultado esperado en esta entrega usando Python 3.12 y dependencias instaladas: `12 passed`.

## Estructura

```text
backend/
  app/api/routers/          endpoints REST
  app/application/services/ lógica de negocio
  app/domain/               entidades, enums e interfaces
  app/infrastructure/db/    clientes de motores de BD
  app/infrastructure/masking/ estrategias de máscara
frontend/
  src/pages/                pantallas principales
  src/services/api.ts       cliente HTTP
scripts/                    scripts auxiliares
docs/                       documentación técnica vigente y ejecución local
```

### Interfaz visual

La interfaz usa una paleta azul marino profesional y permite alternar entre modo oscuro y modo claro desde el login o desde la barra superior. La preferencia queda guardada localmente en el navegador.


## Laboratorio de enmascaramiento

El sistema incluye un apartado **Laboratorio** para seleccionar una conexión activa, inspeccionar tablas/colecciones/labels, ver una muestra real y comparar el dato original contra el resultado enmascarado sin modificar la base de datos.

Endpoints principales:

```text
GET  /api/v1/workbench/connections/{connection_id}/schema
GET  /api/v1/workbench/connections/{connection_id}/records
POST /api/v1/workbench/preview
```

Desde esa pantalla también se pueden guardar reglas basadas en la previsualización para luego ejecutarlas desde el módulo Jobs.

Documentación: `docs/PLAN_SENIOR_LABORATORIO_ENMASCARAMIENTO.md`.

## Flujo principal actualizado

El sistema ahora concentra el trabajo operativo en **Protección de Datos**. Desde ese módulo se selecciona una conexión, se cargan automáticamente las tablas/colecciones/labels disponibles, se muestra una muestra de datos, se eligen columnas o propiedades sensibles, se previsualiza el resultado enmascarado y se puede guardar la regla o ejecutar un job.

La navegación recomendada queda así:

```text
Dashboard → resumen
Conexiones → registrar/probar motores
Protección de Datos → preview, reglas, dry-run y apply
Historial → auditoría de jobs
Admin → usuarios y roles
```


## Mejora: reglas por campo

En el módulo **Protección de Datos**, cada columna/campo/propiedad puede tener un algoritmo y modo diferente. Por ejemplo, se puede aplicar hash al DNI, redacción al teléfono, perturbación a fechas y sustitución a nombres dentro de la misma tabla. La vista previa calcula el resultado por campo sin modificar la base hasta que se ejecute un job en modo `apply`.

### Apply real y restauración

Enmask diferencia claramente vista previa de ejecución real:

- `Dry-run`: simula y no modifica la base.
- `Apply`: aplica la protección en la base conectada según el tipo seleccionado.
- `Campo derivado`: crea/actualiza `*_masked`.
- `Máscara física`: reemplaza datos reales y guarda respaldo en vault.
- `Encriptación simétrica`: cifra datos reales con `ENMASK_MASTER_KEY`.
- `Restaurar / desencriptar`: revierte el job aplicado desde Historial o desde Protección de Datos.

Guía técnica: `docs/MEJORA_APPLY_RESTAURACION_BD_REAL.md`.

### MongoDB: URI completa o campos separados

Enmask permite registrar MongoDB de dos formas:

- Pegando una URI completa en **Host**, por ejemplo `mongodb+srv://usuario:clave@cluster.mongodb.net/`.
- Usando campos separados: Host, Usuario y Contraseña.

Si la contraseña tiene caracteres especiales, el backend los codifica automáticamente antes de crear la conexión.