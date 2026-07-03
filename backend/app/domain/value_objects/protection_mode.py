from enum import Enum


class ProtectionMode(str, Enum):
    """Modo de proteccion aplicado sobre una columna o campo sensible.

    Nivel 1 - Enmascaramiento no destructivo:
    - VIRTUAL_VIEW: mascara solo al consultar desde la aplicacion.
    - MASKED_VIEW: crea una vista/coleccion vista en la BD con columnas enmascaradas.
    - MASKED_COLUMN: agrega una columna/campo derivado con el valor enmascarado.

    Nivel 2 - Proteccion fisica reversible:
    - STATIC_MASK: sobrescribe el dato original, conservando respaldo en vault para restaurar.
    - SYMMETRIC_ENCRYPTION: cifra el dato original con llave simetrica y permite descifrarlo.
    """

    VIRTUAL_VIEW = "virtual_view"
    MASKED_VIEW = "masked_view"
    MASKED_COLUMN = "masked_column"
    STATIC_MASK = "static_mask"
    SYMMETRIC_ENCRYPTION = "symmetric_encryption"
