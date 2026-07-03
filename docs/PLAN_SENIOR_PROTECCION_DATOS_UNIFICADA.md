# Plan Senior - Módulo Unificado de Protección de Datos

## Objetivo

Unificar el flujo principal de Enmask para que el usuario no tenga que saltar entre Laboratorio, Reglas y Jobs. El módulo central ahora es **Protección de Datos**.

## Decisión de arquitectura

Se mantienen separados solo los módulos con responsabilidades distintas:

- **Dashboard**: métricas y resumen ejecutivo.
- **Conexiones**: altas, pruebas y administración de credenciales de motores.
- **Protección de Datos**: selección de conexión, carga de tablas/colecciones/labels, selección de campos, preview, creación de reglas y ejecución.
- **Historial**: auditoría de jobs.
- **Admin**: gobierno de usuarios y roles.

## Flujo aplicado

1. El usuario selecciona una conexión activa.
2. Enmask consulta el esquema del motor.
3. Se cargan tablas, colecciones, claves Redis o labels/tipos Neo4j.
4. El usuario selecciona el objeto.
5. Enmask carga automáticamente una muestra limitada de datos.
6. Se detectan posibles campos sensibles por nombre.
7. Al seleccionar columnas/campos/propiedades se genera una vista comparativa original vs protegida.
8. El usuario puede guardar reglas o ejecutar un dry-run/apply desde la misma pantalla.

## Tratamiento por motor

- SQL: tabla y columnas.
- MongoDB: colección y campos.
- Redis: clave/patrón y campos cuando corresponda.
- Neo4j: label/tipo y propiedad, diferenciando nodo y relación.

## Seguridad operacional

- La vista previa es no destructiva.
- El modo `apply` solicita confirmación.
- Los modos físicos como `static_mask` y `symmetric_encryption` se marcan como destructivos.
- El historial conserva trazabilidad de jobs.
