# Plan senior aplicado: autenticación local, Google y rol administrador

## Objetivo

Dejar el acceso al sistema desacoplado de Google para que Enmask pueda ejecutarse en localhost sin credenciales externas y, al mismo tiempo, mantener Google como mecanismo opcional.

## Decisiones de arquitectura

1. **Autenticación local como ruta principal de desarrollo**
   - Registro con nombre, correo y contraseña.
   - Login con correo y contraseña.
   - Token JWT propio del backend.
   - Contraseña almacenada con hash bcrypt.

2. **Google como proveedor opcional**
   - Solo se renderiza si existe `VITE_GOOGLE_CLIENT_ID`.
   - Permite conservar el flujo institucional si el proyecto se despliega con credenciales reales.

3. **Rol administrador controlado por backend**
   - No se permite que un usuario elija ser administrador desde el formulario.
   - El rol se resuelve por `ADMIN_EMAILS` en `.env`.
   - Esto evita autoescalamiento de privilegios.

4. **Módulo Admin mínimo y ampliable**
   - Vista de usuarios registrados.
   - Conteo de usuarios estándar y administradores.
   - Base preparada para auditoría, gobierno de jobs y gobierno de llaves.

## Endpoints principales

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/v1/auth/register` | Crear cuenta local |
| POST | `/api/v1/auth/login` | Iniciar sesión local |
| POST | `/api/v1/auth/google` | Login con Google |
| GET | `/api/v1/auth/me` | Usuario autenticado |
| GET | `/api/v1/auth/users` | Listar usuarios, solo admin |

## Buenas prácticas aplicadas

- Se separó `UserResponse` del modelo interno para no exponer `password_hash`.
- El frontend guarda únicamente el access token.
- El formulario valida campos antes de enviar.
- El backend valida fortaleza mínima de contraseña.
- El módulo admin queda oculto para usuarios estándar.
- La API protege `/auth/users` con `require_role("admin")`.

## Recomendación para la demo

Para probar rol administrador en localhost:

1. Editar `backend/.env`.
2. Agregar:

```env
ADMIN_EMAILS=admin@demo.com
```

3. Reiniciar backend.
4. Crear cuenta con `admin@demo.com`.
5. Verificar que aparece el módulo **Admin** en el menú lateral.

## Escalamiento futuro

Para producción o una versión más completa se recomienda:

- Persistir usuarios en MongoDB o PostgreSQL en vez de memoria.
- Agregar cambio de contraseña.
- Agregar bloqueo por intentos fallidos.
- Agregar refresh token.
- Agregar recuperación de contraseña.
- Agregar permisos granulares: `admin`, `analyst`, `operator`, `auditor`.
- Agregar auditoría de inicio de sesión y cambios de permisos.
