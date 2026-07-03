# Enmask MCP Server

Servidor MCP para exponer Enmask como herramientas consumibles por asistentes de IA.

## Objetivo

Permitir que un cliente compatible con MCP pueda llamar herramientas como:

- `enmask_health`
- `enmask_list_connections`
- `enmask_test_connection`
- `enmask_inspect_schema`
- `enmask_preview_masking`
- `enmask_list_jobs`
- `enmask_get_job_status`

El servidor MCP no reemplaza al backend FastAPI. Actúa como puente entre el asistente y Enmask.

## Variables de entorno

```powershell
$env:ENMASK_BASE_URL="http://localhost:8000"
$env:ENMASK_TOKEN="TOKEN_JWT_DE_ENMASK"
```

También puede iniciar sesión automáticamente:

```powershell
$env:ENMASK_EMAIL="usuario@correo.com"
$env:ENMASK_PASSWORD="TuPassword123"
```

No publiques estas variables en GitHub.

## Prueba rápida

```powershell
cd integrations\mcp\enmask-mcp-server
node src\index.js --smoke
```

## Configuración de ejemplo para VS Code MCP

Ajusta la ruta absoluta según tu equipo:

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
        "ENMASK_EMAIL": "tu_correo@ejemplo.com",
        "ENMASK_PASSWORD": "TuPassword123"
      }
    }
  }
}
```

## Uso esperado

Un asistente puede pedir:

> Lista mis conexiones de Enmask, inspecciona el esquema de SQL Server y genera una vista previa de enmascaramiento para `Person.Person.EmailPromotion`.

El cliente MCP llamará a las herramientas y el servidor traducirá esas llamadas a endpoints de Enmask.
