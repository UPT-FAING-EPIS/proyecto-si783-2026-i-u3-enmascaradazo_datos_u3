# Mejora senior: MongoDB con URI completa o campos separados

Se ajustó el flujo de conexión MongoDB para admitir dos estilos de uso:

1. **URI completa en Host**
   - `mongodb+srv://usuario:clave@cluster.mongodb.net/`
   - `mongodb://usuario:clave@localhost:27017`

2. **Campos separados**
   - Host: `cluster.mongodb.net`
   - Puerto: `0` para Atlas SRV o `27017` para local
   - Usuario: `usuario`
   - Contraseña: `clave`

## Buenas prácticas aplicadas

- El backend detecta si el Host ya trae `mongodb+srv://` o `mongodb://`.
- Si la URI trae usuario y contraseña, los respeta y los codifica automáticamente.
- Si la URI no trae credenciales, inyecta los campos Usuario/Contraseña.
- Si se usa Atlas (`*.mongodb.net`), usa `mongodb+srv://`.
- El test de conexión ya no devuelve error 500 por una URI inválida; devuelve un mensaje controlado.

## Impacto para el usuario

El usuario puede pegar el formato que normalmente entrega MongoDB Atlas, o llenar los campos por separado. Esto mejora la usabilidad y reduce errores durante la conexión.
