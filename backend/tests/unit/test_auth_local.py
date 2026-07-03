import pytest

from app.application.services.auth_service import AuthService
from app.infrastructure.repositories.user_repository import UserRepository


@pytest.mark.asyncio
async def test_local_register_and_login_issue_token():
    repo = UserRepository()
    service = AuthService(repo)

    registered = await service.register_local("USER@EXAMPLE.COM", "Clave12345", "Usuario Demo")
    assert registered["user"].email == "user@example.com"
    assert registered["access_token"]

    logged = await service.authenticate_local("user@example.com", "Clave12345")
    assert logged["user"].name == "Usuario Demo"
    assert logged["user"].password_hash is not None


@pytest.mark.asyncio
async def test_local_login_rejects_invalid_password():
    repo = UserRepository()
    service = AuthService(repo)
    await service.register_local("demo@example.com", "Clave12345", "Demo")

    with pytest.raises(ValueError, match="INVALID_CREDENTIALS"):
        await service.authenticate_local("demo@example.com", "bad-password")
