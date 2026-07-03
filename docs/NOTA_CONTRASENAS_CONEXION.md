# Nota sobre contraseñas en conexiones

Enmask permite registrar conexiones con contraseña vacía cuando el motor y el usuario lo permiten.

Ejemplos comunes:

- MySQL/XAMPP: el usuario `root` puede venir sin contraseña.
- Redis local: puede ejecutarse sin usuario ni contraseña.
- MongoDB local: puede ejecutarse sin autenticación si el servidor fue configurado así.

La contraseña se mantiene como campo opcional en el frontend. El backend valida la conexión real contra el motor seleccionado; si el motor exige contraseña, la prueba de conexión fallará y mostrará el error correspondiente.

Buenas prácticas:

- En entornos reales, no uses `root` para la aplicación.
- Crea un usuario con permisos mínimos para Enmask.
- Limita permisos según el modo: lectura para vista virtual, escritura para columnas enmascaradas o encriptación.
