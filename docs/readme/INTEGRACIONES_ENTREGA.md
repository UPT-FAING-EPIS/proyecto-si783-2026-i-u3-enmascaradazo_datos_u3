# Integraciones de Enmask para la unidad

## Estado del apartado Skill

El apartado Skill queda completo como entregable documental y empaquetado:

- `enmask-data-protection-advisor`: Skill para recomendar reglas, algoritmos, modos de proteccion y documentacion de evidencias.
- `enmask-connection-diagnostician`: Skill para diagnosticar conexiones multi-motor, errores de URI, puertos, drivers, TLS, schemas y autenticacion.

Para la entrega, adjuntar los `skill.zip` dentro de:

```text
integrations/skills/
```

Si la consigna exige publicacion externa, subirlos tambien a la biblioteca/plataforma de Skills disponible y colocar evidencia en GitHub.

## Extension de VS Code

Ubicacion:

```text
integrations/vscode/enmask-vscode
```

Estado:

- Codigo fuente incluido.
- Comandos definidos en `package.json`.
- Login y operaciones principales implementadas.
- Documentacion de ejecucion y publicacion incluida.

## Integracion adicional seleccionada: MCP Server

Ubicacion:

```text
integrations/mcp/enmask-mcp-server
```

Justificacion:

MCP es la mejor integracion adicional para Enmask porque convierte la aplicacion en una herramienta consumible por asistentes de IA. Permite automatizar flujos como inspeccion de esquemas, sugerencia de reglas y vista previa de enmascaramiento.

## Estructura recomendada en GitHub

```text
README.md
backend/
frontend/
docs/
  INTEGRACIONES_ENTREGA.md
  EXTENSION_VSCODE_ENMASK.md
  MCP_ENMASK_INTEGRACION.md
integrations/
  skills/
  vscode/
    enmask-vscode/
  mcp/
    enmask-mcp-server/
```

## Frase para presentacion

Enmask se presenta como una plataforma multi-motor de proteccion de datos con integraciones externas. Se implementaron dos Skills para asistencia inteligente, una extension de VS Code para operar Enmask desde el entorno de desarrollo y un servidor MCP para que asistentes de IA puedan consumir las funciones del backend como herramientas.
