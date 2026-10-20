"""Typed environment values shared by Django settings."""

from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_DIR = Path(__file__).resolve().parents[3]


class EnvironmentSettings(BaseSettings):
    """Read local env files and allow process variables to override them."""

    model_config = SettingsConfigDict(
        env_file=(REPOSITORY_DIR / ".env", REPOSITORY_DIR / ".env.local"),
        extra="ignore",
    )

    django_debug: bool = True
    django_secret_key: SecretStr | None = None
    django_allowed_hosts: str = "localhost,127.0.0.1"
    postgres_db: str = "caderno"
    postgres_user: str = "caderno"
    postgres_password: SecretStr | None = None
    postgres_host: str = "localhost"
    postgres_port: int = 5432
