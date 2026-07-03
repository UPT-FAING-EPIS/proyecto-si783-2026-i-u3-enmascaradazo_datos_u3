# Ejecución local en Visual Studio Code

Esta guía deja el proyecto listo para ejecutarse en localhost con dos terminales: una para el backend FastAPI y otra para el frontend Vite.

## 1. Abrir el proyecto

1. Descomprime el ZIP.
2. Abre Visual Studio Code.
3. Click en **File → Open Folder**.
4. Selecciona la carpeta raíz del proyecto, donde están `backend`, `frontend`, `docs` y `scripts`.

## 2. Backend

Terminal 1:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Rutas de verificación:

- API: `http://127.0.0.1:8000/api/v1`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

## 3. Frontend

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Abre:

```text
http://localhost:5173
```

## 4. Ejecución automática opcional

Desde la raíz del proyecto:

```powershell
.\scripts\start-local.ps1
```

Si Windows bloquea scripts de PowerShell, usa:

```cmd
scripts\start-local.cmd
```

## 5. Validaciones de compilación

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH='.'
python -m compileall app tests
pytest -q
```

Frontend:

```powershell
cd frontend
npm install
npm run build
```

## 6. Puertos usados

| Servicio | Puerto |
|---|---:|
| Backend FastAPI | 8000 |
| Frontend Vite | 5173 |

El frontend usa por defecto `http://127.0.0.1:8000/api/v1` en modo desarrollo. Si cambias el puerto del backend, crea `frontend/.env` con:

```env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

## 7. Crear cuenta local y probar administrador

El sistema ya no depende solamente de Google.

1. Abre `http://localhost:5173/login`.
2. Selecciona **Crear cuenta**.
3. Registra nombre, correo y contraseña.
4. El sistema iniciará sesión automáticamente.

Para probar un usuario administrador en localhost:

1. Abre `backend/.env`.
2. Configura el correo que quieres usar como administrador:

```env
ADMIN_EMAILS=admin@demo.com
```

3. Reinicia el backend.
4. Entra a `http://localhost:5173/login`.
5. Crea la cuenta con `admin@demo.com` o inicia sesión con ese correo si ya existe.
6. El menú lateral mostrará el módulo **Admin**.

Nota: con `REPOSITORY_BACKEND=memory`, las cuentas locales se borran cuando reinicias el backend. Para mantener usuarios entre reinicios, usa un backend de metadatos persistente como MongoDB o PostgreSQL.
