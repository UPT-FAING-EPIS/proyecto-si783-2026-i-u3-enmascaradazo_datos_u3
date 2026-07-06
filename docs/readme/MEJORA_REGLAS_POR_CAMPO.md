# Mejora senior: reglas por campo y vista previa consistente

## Objetivo

El módulo **Protección de Datos** ahora permite configurar cada columna/campo/propiedad de forma independiente. Esto evita el error funcional de aplicar un único algoritmo global a todos los campos seleccionados.

## Flujo aplicado

1. Seleccionar conexión activa.
2. Seleccionar tabla, colección, clave, label o tipo de relación.
3. Enmask carga el esquema y una muestra de datos.
4. Agregar cada campo desde un combo box.
5. Configurar por campo:
   - algoritmo,
   - modo de protección,
   - opciones de redacción cuando corresponda.
6. Generar vista comparativa original vs protegido.
7. Guardar reglas o ejecutar dry-run/apply.

## Ejemplo

Se puede configurar una misma tabla así:

- `dni` con Hash SHA-256.
- `telefono` con Redacción visual.
- `fecha_nacimiento` con Perturbación.
- `nombre` con Sustitución.
- `password` con Hash o Encriptación simétrica.

## Nota sobre tablas sin datos

Si una tabla carga columnas pero muestra `0 registros`, significa que la estructura fue leída correctamente, pero la consulta de muestra no devolvió filas. Puede ocurrir porque la tabla está vacía o porque el usuario de conexión no tiene filas visibles.

## Backend

Se agregó soporte para `field_rules` en `WorkbenchMaskPreviewRequest`, manteniendo compatibilidad con `target_columns` antiguo.

## Frontend

El módulo `Protección de Datos` ahora usa tarjetas compactas de reglas por campo. Cada tarjeta puede cambiar su algoritmo y modo sin afectar a las demás.
