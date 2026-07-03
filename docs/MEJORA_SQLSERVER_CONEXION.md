# Mejora de conexión SQL Server en Enmask

## Problema detectado

El backend declaraba soporte para SQL Server mediante `mssql+aioodbc`, pero el contenedor no instalaba Microsoft ODBC Driver 18 ni `unixODBC`. Por eso, aunque `aioodbc` estuviera en `requirements.txt`, la conexión podía fallar con errores como:

```text
Can't open lib 'ODBC Driver 18 for SQL Server'
Data source name not found
Login timeout expired
```

Además, la cadena anterior usaba formato URL simple `host:port`. Para SQL Server es más confiable usar cadena ODBC DSN-less con `SERVER=host,port` o `SERVER=HOST\INSTANCIA`.

## Cambios aplicados

1. `backend/Dockerfile`
   - Instala `unixodbc`, `unixodbc-dev` y `msodbcsql18`.
   - Acepta la licencia del driver con `ACCEPT_EULA=Y`.

2. `backend/requirements.txt`
   - Agrega `pyodbc>=5.1.0` explícitamente.

3. `backend/app/infrastructure/db/sqlserver_client.py`
   - Cambia la construcción de DSN a `odbc_connect`.
   - Soporta mejor passwords con caracteres especiales.
   - Soporta `host,puerto` y `HOST\INSTANCIA`.
   - Agrega `Encrypt=yes` y `TrustServerCertificate=yes` por defecto para desarrollo.

4. `backend/app/application/services/connection_service.py`
   - Devuelve mensajes de error más útiles para SQL Server.

5. `docker-compose.yml`
   - Agrega `host.docker.internal:host-gateway` para que el backend en Docker pueda alcanzar SQL Server instalado en la máquina anfitriona.

## Cómo probar desde Docker

Si SQL Server está instalado en Windows y Enmask corre en Docker, no uses `localhost` como host. Dentro del contenedor, `localhost` es el propio contenedor.

Usa:

```text
host: host.docker.internal
port: 1433
database: NombreDeTuBD
username: sa o tu_usuario_sql
password: tu_contraseña
```

O como URI:

```text
mssql://usuario:clave@host.docker.internal:1433/NombreDeTuBD?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes
```

## Configuración necesaria en SQL Server

En SQL Server Configuration Manager:

1. Habilitar `SQL Server Network Configuration > Protocols > TCP/IP`.
2. En `TCP/IP > IP Addresses`, definir `TCP Port = 1433`.
3. Reiniciar el servicio de SQL Server.
4. Permitir el puerto 1433 en el Firewall de Windows.
5. Usar autenticación SQL Server o modo mixto, no solo Windows Authentication.

## Comprobación dentro del contenedor

```bash
docker compose build backend --no-cache
docker compose up -d backend

docker compose exec backend python - <<'PYSQL'
import pyodbc
print(pyodbc.drivers())
PYSQL
```

Debe aparecer:

```text
['ODBC Driver 18 for SQL Server']
```
