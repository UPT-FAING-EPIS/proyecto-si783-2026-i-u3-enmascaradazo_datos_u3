# Integracion MCP: Enmask MCP Server

## Objetivo

El servidor MCP permite que asistentes de IA usen Enmask como herramienta externa. Esta integracion expone operaciones del backend FastAPI como herramientas invocables: listar conexiones, inspeccionar esquemas, generar previews de enmascaramiento y consultar jobs.

## Ubicacion

```text
integrations/mcp/enmask-mcp-server
```

## Herramientas expuestas

| Tool | Funcion |
|---|---|
| `enmask_health` | Verifica que el backend este levantado. |
| `enmask_list_connections` | Lista conexiones guardadas. |
| `enmask_test_connection` | Prueba una conexion existente. |
| `enmask_inspect_schema` | Lee esquema/colecciones/labels/relaciones. |
| `enmask_preview_masking` | Genera vista previa de enmascaramiento. |
| `enmask_list_jobs` | Lista jobs del usuario. |
| `enmask_get_job_status` | Consulta estado de un job. |

## Variables de entorno

```powershell
$env:ENMASK_BASE_URL="http://localhost:8000"
$env:ENMASK_EMAIL="usuario@correo.com"
$env:ENMASK_PASSWORD="TuPassword123"
```

O usando token:

```powershell
$env:ENMASK_TOKEN="TOKEN_JWT_DE_ENMASK"
```

Nunca subir credenciales reales a GitHub.

## Prueba rapida

```powershell
cd integrations\mcp\enmask-mcp-server
node src\index.js --smoke
```

## Configuracion de cliente MCP

Ejemplo:

```json
{
  "servers": {
    "enmask": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:/Users/W10/Desktop/enmask_sys/integrations/mcp/enmask-mcp-server/src/index.js"
      ],
      "env": {
        "ENMASK_BASE_URL": "http://localhost:8000",
        "ENMASK_EMAIL": "usuario@correo.com",
        "ENMASK_PASSWORD": "TuPassword123"
      }
    }
  }
}
```

## Flujo de demostracion

1. Levantar backend Enmask.
2. Configurar credenciales del usuario Enmask.
3. Iniciar el servidor MCP desde el cliente.
4. Pedir al asistente: "lista mis conexiones Enmask".
5. Pedir: "inspecciona el esquema de mi conexion SQL Server".
6. Pedir: "genera una vista previa de enmascaramiento para un campo sensible".

## Valor para el proyecto

Esta integracion demuestra que Enmask no solo tiene interfaz web, sino que tambien puede ser consumido por agentes de IA mediante herramientas formales.
