import base64
import hashlib
from typing import Any, Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _derive_development_key(seed: str) -> bytes:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet() -> Fernet:
    """Devuelve la llave simetrica de aplicacion.

    En produccion se debe configurar ENMASK_MASTER_KEY con una llave Fernet valida.
    Para desarrollo se deriva una llave desde SECRET_KEY para que el proyecto funcione
    sin exponer una llave hardcodeada en el codigo fuente.
    """
    configured = getattr(settings, "ENMASK_MASTER_KEY", "") or ""
    if configured.strip():
        return Fernet(configured.strip().encode("utf-8"))
    return Fernet(_derive_development_key(settings.SECRET_KEY or "changemeplease"))


def encrypt_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    token = get_fernet().encrypt(str(value).encode("utf-8"))
    return token.decode("utf-8")


def decrypt_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        data = get_fernet().decrypt(str(value).encode("utf-8"))
        return data.decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("No se pudo desencriptar el valor. Verifica que la llave simetrica sea la misma usada al encriptar.") from exc
