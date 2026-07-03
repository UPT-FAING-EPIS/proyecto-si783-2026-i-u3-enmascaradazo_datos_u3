# Enmask Assistant para VS Code

Extensión de VS Code para operar Enmask desde el entorno del desarrollador.

## Funciones

- Configurar URL del backend Enmask.
- Iniciar/cerrar sesión contra `/api/v1/auth/login`.
- Verificar backend y usuario activo.
- Listar conexiones guardadas.
- Inspeccionar esquemas, tablas, colecciones, labels o relaciones.
- Ejecutar vista previa de enmascaramiento desde VS Code.
- Listar jobs recientes.
- Abrir el dashboard web de Enmask.

## Comandos

- `Enmask: Set Backend URL`
- `Enmask: Login`
- `Enmask: Logout`
- `Enmask: Test Backend`
- `Enmask: List Connections`
- `Enmask: Inspect Schema`
- `Enmask: Preview Masking`
- `Enmask: List Jobs`
- `Enmask: Open Dashboard`

## Ejecución en desarrollo

1. Abre esta carpeta en VS Code.
2. Presiona `F5` para iniciar Extension Development Host.
3. Ejecuta `Enmask: Set Backend URL` si tu backend no está en `http://localhost:8000`.
4. Ejecuta `Enmask: Login`.
5. Usa la vista lateral `Enmask`.

## Empaquetado local

```powershell
npm install
npm install -g @vscode/vsce
vsce package
```

Genera un archivo `.vsix` instalable.

## Instalación local

```powershell
code --install-extension enmask-vscode-0.1.0.vsix
```

## Publicación

```powershell
vsce login TU_PUBLISHER
vsce publish
```

Antes de publicar, cambia el campo `publisher` en `package.json` por el identificador real de tu cuenta de Visual Studio Marketplace.
