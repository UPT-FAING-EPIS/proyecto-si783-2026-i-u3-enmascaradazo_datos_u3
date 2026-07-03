# Mejora Senior: Jobs, restauracion y eliminacion segura

## Cambios aplicados

- Se retiro la accion **Share** del Historial porque no aporta al flujo principal de la demo.
- Se agrego accion **Eliminar** para borrar jobs del historial.
- Se agrego proteccion de seguridad: si un job `apply` esta completado y genero artefactos o cambios fisicos, el backend exige restaurarlo primero antes de eliminarlo.
- Se renombro el flujo visual de `Unmask` a **Restaurar**, porque su comportamiento real depende del modo de proteccion:
  - Vista enmascarada: elimina la vista.
  - Campo derivado: elimina la columna/campo/propiedad generada.
  - Mascara fisica: restaura desde vault.
  - Encriptacion simetrica: restaura desde vault o descifra con la llave simetrica.
- Se agrego un **vault local persistente** en `backend/data/vault_backups.json` para que la restauracion no se pierda al reiniciar el backend en localhost.

## Observacion tecnica importante

Una mascara fisica como `987654321 -> 98****21` no se puede revertir matematicamente, porque se destruye parte del valor original. Para restaurarla se necesita un respaldo previo. Por eso Enmask guarda automaticamente el valor original en el vault antes de aplicar `static_mask`.

La encriptacion simetrica si se puede revertir con la llave, siempre que `ENMASK_MASTER_KEY` sea la misma con la que se cifro el dato.

## Recomendacion para demo

Para demostrar restauracion:

1. Crear una regla con `static_mask` o `symmetric_encryption`.
2. Ejecutar en modo `apply`.
3. Verificar que la base cambio.
4. Ir a Historial.
5. Presionar **Restaurar**.
6. Verificar que los datos vuelven a su valor original.

No borrar el job antes de restaurarlo.
