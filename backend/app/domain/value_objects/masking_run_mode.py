from enum import Enum


class MaskingRunMode(str, Enum):
    """Forma de ejecucion del job.

    DRY_RUN: previsualiza el resultado sin tocar la BD destino.
    APPLY: ejecuta el modo definido en cada regla: vista, columna derivada,
    mascara fisica o encriptacion simetrica.
    """

    DRY_RUN = "dry_run"
    APPLY = "apply"
