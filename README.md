# Enmask v2.0 — Plataforma Unificada de Protección de Datos

Enmask es una solución corporativa de **SecOps / DBA Tools** diseñada para automatizar el aprovisionamiento de bases de datos protegidas en entornos no productivos (desarrollo, pruebas, QA). La plataforma permite inspeccionar esquemas, definir reglas de enmascaramiento por campo, previsualizar resultados en tiempo real, ejecutar tareas de ofuscación de forma segura mediante un **Vault cifrado**, y evaluar cuantitativamente el impacto en el rendimiento (overhead) mediante un panel de telemetría integrado.

---

## 🚀 Características Principales

### 1. Soporte Multimotor Agnóstico
Enmask v2.0 se conecta de forma nativa a **9 motores de bases de datos** mediante URIs de conexión seguras o formularios estructurados:

| Tipo | Motor | Librería / Driver | Nota técnica |
|---|---|---|---|
| **Relacional** | PostgreSQL | `asyncpg` / `psycopg2` | Soporta conexiones directas o cloud (Supabase). |
| **Relacional** | MySQL / MariaDB | `aiomysql` | Compatible con entornos locales y cloud. |
| **Relacional** | SQL Server | `pymssql` | Soporta autenticación nativa y ODBC. |
| **Relacional** | Oracle Database | `python-oracledb` | Soporta SID o nombres de servicio corporativos. |
| **Documental** | MongoDB | `motor` / `pymongo` | Soporta URIs complejas (`mongodb+srv://`) y anidamientos. |
| **Clave-Valor** | Redis | `redis-py` | Mapeo por índices lógicos de base de datos. |
| **Gobernanza** | Cassandra | `cassandra-driver` | Mapea keyspaces y familias de columnas. |
| **Grafos** | Neo4j | `neo4j` (Bolt) | Protege propiedades sobre nodos o relaciones. |
| **Local** | SQLite | `aiosqlite` | Ideal para demostraciones y configuraciones rápidas. |

### 2. Catálogo de Algoritmos de Enmascaramiento
- **`substitution`:** Reemplazo determinista y coherente mediante diccionarios sintéticos (Faker) para mantener la verosimilitud de nombres, direcciones y correos.
- **`hashing`:** Ofuscación criptográfica irreversible con SHA-256 y sal (salt) configurable.
- **`redaction`:** Ofuscación de caracteres sensibles (e.g. reemplazo por asteriscos en los primeros 12 dígitos de tarjetas de crédito).
- **`nullification`:** Reemplazo físico o virtual de datos por valores nulos (`NULL`).
- **`fpe` (Format Preserving Encryption):** Cifrado que conserva el formato original para campos estructurados como DNI o teléfonos.
- **`perturbation`:** Variación numérica o temporal controlada para datos numéricos o fechas (e.g. variación aleatoria en un rango de ±10%).

### 3. Modos de Protección Flexibles
- **`virtual_view`:** Enmascarado dinámico en memoria. No toca la base de datos; la transformación ocurre en el backend de FastAPI al vuelo.
- **`masked_view`:** Crea vistas lógicas seguras (`masked_view`) en el motor de destino.
- **`masked_column`:** Genera columnas derivadas duplicadas (`dni_masked`) para preservar los datos originales intactos.
- **`static_mask`:** Reemplazo físico destructivo en la tabla de destino, respaldando previamente los valores originales en el **Vault seguro**.
- **`symmetric_encryption`:** Cifrado reversible a nivel de columna utilizando una clave maestra Fernet y el algoritmo AES-256.

---

## 🛠️ Arquitectura del Repositorio

```text
proyecto-enmask/
├── .agents/                 # Habilidades (Skills) personalizadas para el espacio de trabajo
│   └── skills/              # Prompts, playbooks y scripts de ayuda para asistentes de IA
├── .github/
│   └── workflows/           # CI/CD: Workflow de autogeneración de diagramas PlantUML
├── backend/                 # API FastAPI, orquestador de jobs y adaptadores de BD
├── frontend/                # React Single Page Application (SPA) con Vite y TypeScript
├── integrations/            # Clientes externos:
│   ├── mcp/                 # Servidor MCP stdio para integraciones de agentes (Claude Desktop)
│   ├── skills/              # Archivos de distribución académica (skill.zip)
│   └── vscode/              # Extensión oficial de Enmask para VS Code
├── scripts/                 # Utilidades de desarrollo (compilador de PlantUML, seeders)
└── docs/                    # Documentación y entregables académicos (FD01-FD06)
    ├── diagrams/            # Diagramas fuente (.puml) e imágenes compiladas (.png)
    └── readme/              # Documentos de especificación técnica y guías de mejora
```

---

## 💻 Instalación y Ejecución en Local

### Requisitos Previos
- **Python:** v3.11 o superior.
- **Node.js:** v18.0 o superior con `npm`.
- **Docker & Docker Compose** (Opcional, para despliegue rápido).

### Despliegue Manual

#### 1. Backend (FastAPI)
```powershell
cd backend
python -m venv .venv
# Activar entorno (Windows)
.\.venv\Scripts\Activate.ps1
# Instalar dependencias
pip install -r requirements.txt
# Crear variables de entorno
Copy-Item .env.example .env
# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Ruta Swagger/OpenAPI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Endpoint Healthcheck:** [http://localhost:8000/health](http://localhost:8000/health)

#### 2. Frontend (React)
```powershell
cd ../frontend
npm install
npm run dev
```
- **URL de la aplicación:** [http://localhost:5173](http://localhost:5173)
- **Credenciales por Defecto:** Regístrate con una cuenta local y añade el correo a `ADMIN_EMAILS` en `backend/.env` para activar los privilegios de administrador.

### Despliegue con Docker Compose
Para levantar la plataforma completa de forma automatizada:
```powershell
docker-compose up --build
```

---

## 🤖 Habilidades Integradas de Agente (Workspace Skills)

Enmask v2.0 incorpora instrucciones formales de habilidades bajo el directorio [.agents/skills/](file:///.agents/skills/) para que los asistentes de IA (Gemini, Claude) puedan asistir inteligentemente en el espacio de trabajo:

1. **`enmask-connection-diagnostician`**:
   - **Ubicación:** `.agents/skills/enmask-connection-diagnostician/`
   - **Propósito:** Diagnosticar problemas de red, puertos, esquemas incorrectos, credenciales, drivers ODBC de SQL Server o TLS/SSL.
2. **`enmask-data-protection-advisor`**:
   - **Ubicación:** `.agents/skills/enmask-data-protection-advisor/`
   - **Propósito:** Recomendar algoritmos apropiados para tipos de datos (hashing para DNI, substitution para nombres), diseñar planes de ejecución en modo Dry-Run o Apply, y documentar evidencias.

Ambas habilidades están empaquetadas como entregables bajo `integrations/skills/<nombre-skill>/skill.zip`.

---

## 🔌 Integraciones Externas

### 1. Servidor MCP (Model Context Protocol)
El servidor stdio de Enmask permite que herramientas externas de IA (como Claude Desktop, Cursor o Windsurf) interactúen directamente con el backend de Enmask para listar conexiones, inspeccionar esquemas, previsualizar datos y auditar ejecuciones.

#### Configuración en Claude Desktop
Añade la configuración en tu archivo `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "enmask-mcp-server": {
      "command": "node",
      "args": [
        "C:/ruta-al-proyecto/integrations/mcp/enmask-mcp-server/src/index.js"
      ],
      "env": {
        "ENMASK_BASE_URL": "http://localhost:8000",
        "ENMASK_EMAIL": "tu_usuario@correo.com",
        "ENMASK_PASSWORD": "TuPassword123"
      }
    }
  }
}
```
*Nota: El servidor stdio fue corregido a comunicación por líneas JSON (`JSONL` con terminador `\n`), resolviendo bloqueos de conexión.*

### 2. Extensión de VS Code
Ubicada en `integrations/vscode/enmask-vscode/`. Permite conectarse a la API de Enmask, evaluar la seguridad de archivos locales y ejecutar enmascaramientos directamente desde la barra de comandos del editor.

---

## 🧪 Pruebas Unitarias
El proyecto cuenta con una batería de pruebas de integración y correctitud para validar la normalización de conexiones URI y estrategias de enmascaramiento.
```powershell
cd backend
$env:PYTHONPATH="."
pytest
```