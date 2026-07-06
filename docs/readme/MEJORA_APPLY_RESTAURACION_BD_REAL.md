# Mejora: Apply real, recarga desde BD y restauracion/desencriptacion

## Objetivo

Asegurar que el flujo de Protección de Datos no se quede solo en vista previa. Cuando el usuario selecciona `Apply`, Enmask ejecuta el cambio contra la base de datos conectada y luego recarga la muestra directamente desde esa misma base para verificar el resultado real.

## Comportamiento por tipo de protección

| Tipo de protección | Efecto al ejecutar Apply | Restauración |
|---|---|---|
| Vista virtual | No modifica la BD. Solo consulta segura desde Enmask. | No requiere restaurar. |
| Vista enmascarada | Crea una vista/artefacto protegido cuando el motor lo permite. | Elimina la vista generada. |
| Campo derivado | Crea/actualiza una columna/campo/propiedad `*_masked` en la BD real. | Elimina el campo derivado. |
| Máscara física | Reemplaza el valor original en la columna real y guarda respaldo en vault. | Restaura el valor original desde vault. |
| Encriptación simétrica | Cifra físicamente el valor original en la columna real. | Restaura desde vault o descifra con `ENMASK_MASTER_KEY`. |

## Cambios aplicados

- La vista previa ahora representa mejor el efecto real:
  - `Campo derivado` muestra una columna adicional `*_masked`.
  - `Encriptación simétrica` muestra un valor cifrado simulado.
  - `Máscara física` muestra el valor reemplazado.
- Después de un `Apply` exitoso, la pantalla de Protección de Datos recarga la muestra desde la base real.
- Se agregó botón contextual `Restaurar / desencriptar último apply` para revertir el último job aplicado desde la misma pantalla.
- El backend mantiene vault persistente local para restaurar máscara física y encriptación simétrica.

## Nota de seguridad

`Dry-run` y vista previa nunca modifican la base. Solo `Apply` ejecuta cambios reales. Si la conexión apunta a una BD remota, el cambio se hace en esa BD remota.
