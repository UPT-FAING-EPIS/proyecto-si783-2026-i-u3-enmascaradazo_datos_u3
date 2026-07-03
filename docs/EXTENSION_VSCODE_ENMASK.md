# Extension de VS Code: Enmask Assistant

## Objetivo

La extension de VS Code permite operar Enmask desde el entorno del desarrollador. Esta integracion complementa el dashboard web y demuestra que Enmask puede exponerse como herramienta para flujos de desarrollo.

## Ubicacion

```text
integrations/vscode/enmask-vscode
```

## Funciones implementadas

- Configuracion de URL del backend.
- Login contra `/api/v1/auth/login`.
- Cierre de sesion.
- Verificacion de backend y usuario activo.
- Listado de conexiones.
- Inspeccion de esquemas.
- Vista previa de enmascaramiento.
- Listado de jobs.
- Apertura del dashboard web.
- Vistas laterales para conexiones y jobs.

## Requisitos

- Backend Enmask levantado.
- Frontend Enmask levantado si se quiere abrir dashboard.
- VS Code.
- Node.js y npm si se quiere empaquetar la extension.

## Uso en desarrollo

```powershell
cd integrations\vscode\enmask-vscode
npm install
code .
```

Luego presionar `F5` en VS Code para abrir Extension Development Host.

## Empaquetado

```powershell
npm install -g @vscode/vsce
vsce package
```

Esto genera un archivo instalable `.vsix`.

## Instalacion local

```powershell
code --install-extension enmask-vscode-0.1.0.vsix
```

## Publicacion

Antes de publicar, cambiar en `package.json`:

```json
"publisher": "enmask-lab"
```

por el publisher real de la cuenta de Visual Studio Marketplace.

Luego ejecutar:

```powershell
vsce login TU_PUBLISHER
vsce publish
```

## Evidencia sugerida para la exposicion

1. Captura de la carpeta `integrations/vscode/enmask-vscode` en GitHub.
2. Captura de la extension instalada en VS Code.
3. Captura del comando `Enmask: Login`.
4. Captura de la vista lateral Enmask mostrando conexiones.
5. Captura de una vista previa de enmascaramiento en JSON.
