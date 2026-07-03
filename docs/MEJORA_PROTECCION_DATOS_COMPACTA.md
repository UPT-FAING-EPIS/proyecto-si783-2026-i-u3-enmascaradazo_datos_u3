# Mejora de Protección de Datos compacta

Se ajustó el módulo **Protección de Datos** para que el flujo sea más directo y menos cargado visualmente.

## Cambios principales

- La pantalla se simplificó visualmente: menos tarjetas, menos indicadores repetidos y una comparación central más limpia.
- Al seleccionar una conexión, Enmask carga automáticamente los objetos disponibles: tablas, colecciones, claves o labels.
- Al seleccionar un objeto, Enmask intenta cargar automáticamente una muestra de registros.
- Si el objeto no tiene registros, se muestra un mensaje claro indicando que la estructura fue cargada, pero no hay datos de muestra.
- La selección de columnas/campos/propiedades ya no aparece como una lista de etiquetas masiva. Ahora se usa un combo box y un botón **Agregar**.
- Los campos agregados se muestran en una lista compacta con opción **Quitar**.
- Se mantiene la comparación entre datos originales y resultado protegido.

## Recomendación de uso

1. Crear y probar una conexión en **Conexiones**.
2. Entrar a **Protección de Datos**.
3. Seleccionar conexión.
4. Seleccionar tabla, colección, label o tipo de relación.
5. Verificar si la muestra original carga registros.
6. Seleccionar campos sensibles desde el combo box.
7. Revisar la vista protegida.
8. Guardar reglas o ejecutar dry-run/apply.

## Nota sobre tablas vacías

Si la tabla original no muestra registros pero sí muestra columnas detectadas, el problema no es de lectura de esquema. Significa que la tabla seleccionada no tiene registros visibles con el usuario de conexión o la muestra no encontró filas.
