"""Production configuration must fail safely without changing local HTTP flows."""

import runpy
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.test import Client, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from caderno.env_vars import EnvironmentSettings

SETTINGS_PATH = Path(__file__).resolve().parents[1] / "settings.py"
TEST_SECRET_KEY = "test-only-production-key-with-at-least-fifty-characters-123456789"
TEST_DATABASE_PASSWORD = "test-only-database-password"
TEST_HOST = "crm.example.com"


@pytest.fixture(autouse=True)
def set_environment_for_security_tests(monkeypatch: pytest.MonkeyPatch) -> None:
    """Isolate settings loads from local credentials and the runner's environment."""
    monkeypatch.setitem(EnvironmentSettings.model_config, "env_file", None)
    for field_name in EnvironmentSettings.model_fields:
        monkeypatch.delenv(field_name.upper(), raising=False)
    monkeypatch.setenv("DJANGO_SECRET_KEY", TEST_SECRET_KEY)
    monkeypatch.setenv("POSTGRES_PASSWORD", TEST_DATABASE_PASSWORD)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", TEST_HOST)


class TestSecuritySettings:
    def test_missing_debug_setting_uses_secure_production_defaults(self) -> None:
        # Act
        configuration = runpy.run_path(str(SETTINGS_PATH))

        # Assert
        assert configuration["DEBUG"] is False
        assert configuration["SESSION_COOKIE_SECURE"] is True
        assert configuration["CSRF_COOKIE_SECURE"] is True
        assert configuration["SECURE_SSL_REDIRECT"] is True
        assert configuration["SECURE_HSTS_SECONDS"] > 0
        assert configuration["SECURE_PROXY_SSL_HEADER"] is None

    def test_local_debug_keeps_http_and_development_credentials(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Arrange
        monkeypatch.setenv("DJANGO_DEBUG", "1")
        monkeypatch.delenv("DJANGO_SECRET_KEY")
        monkeypatch.delenv("POSTGRES_PASSWORD")

        # Act
        configuration = runpy.run_path(str(SETTINGS_PATH))

        # Assert
        assert configuration["DEBUG"] is True
        assert configuration["SESSION_COOKIE_SECURE"] is False
        assert configuration["CSRF_COOKIE_SECURE"] is False
        assert configuration["SECURE_SSL_REDIRECT"] is False
        assert configuration["SECURE_HSTS_SECONDS"] == 0
        assert configuration["SECRET_KEY"] == "development-only-secret-key"

    @pytest.mark.parametrize(
        "secret_key",
        [
            "",
            "development-only-secret-key",
            "short-key",
            "x" * 64,
            "django-insecure-" + TEST_SECRET_KEY,
        ],
    )
    def test_production_rejects_missing_or_unsafe_secret_key(
        self, monkeypatch: pytest.MonkeyPatch, secret_key: str
    ) -> None:
        # Arrange
        monkeypatch.setenv("DJANGO_SECRET_KEY", secret_key)

        # Act and assert
        with pytest.raises(ImproperlyConfigured, match="DJANGO_SECRET_KEY"):
            runpy.run_path(str(SETTINGS_PATH))

    @pytest.mark.parametrize("database_password", ["", "caderno"])
    def test_production_rejects_missing_or_example_database_password(
        self, monkeypatch: pytest.MonkeyPatch, database_password: str
    ) -> None:
        # Arrange
        monkeypatch.setenv("POSTGRES_PASSWORD", database_password)

        # Act and assert
        with pytest.raises(ImproperlyConfigured, match="POSTGRES_PASSWORD"):
            runpy.run_path(str(SETTINGS_PATH))

    @pytest.mark.parametrize("allowed_hosts", ["", "*", "crm.example.com, *"])
    def test_production_requires_explicit_hosts_without_wildcard(
        self, monkeypatch: pytest.MonkeyPatch, allowed_hosts: str
    ) -> None:
        # Arrange
        monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", allowed_hosts)

        # Act and assert
        with pytest.raises(ImproperlyConfigured, match="DJANGO_ALLOWED_HOSTS"):
            runpy.run_path(str(SETTINGS_PATH))

    def test_allowed_hosts_trim_spaces_and_ignore_empty_entries(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Arrange
        monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", f" {TEST_HOST}, , www.example.com ")

        # Act
        configuration = runpy.run_path(str(SETTINGS_PATH))

        # Assert
        assert configuration["ALLOWED_HOSTS"] == [TEST_HOST, "www.example.com"]

    def test_production_rejects_implicit_local_host_defaults(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Arrange
        monkeypatch.delenv("DJANGO_ALLOWED_HOSTS")

        # Act and assert
        with pytest.raises(ImproperlyConfigured, match="DJANGO_ALLOWED_HOSTS"):
            runpy.run_path(str(SETTINGS_PATH))

    def test_http_redirect_ignores_untrusted_https_header(self) -> None:
        # Arrange
        configuration = runpy.run_path(str(SETTINGS_PATH))
        with override_settings(
            ALLOWED_HOSTS=configuration["ALLOWED_HOSTS"],
            SECURE_SSL_REDIRECT=configuration["SECURE_SSL_REDIRECT"],
            SECURE_PROXY_SSL_HEADER=configuration["SECURE_PROXY_SSL_HEADER"],
        ):
            # Act
            response = Client().get(
                reverse("get_current_user"),
                HTTP_HOST=TEST_HOST,
                HTTP_X_FORWARDED_PROTO="https",
            )

        # Assert
        assert response.status_code == 301
        assert response["Location"] == f"https://{TEST_HOST}/api/me/"

    def test_trusted_proxy_https_sets_secure_csrf_cookie_and_hsts(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Arrange
        monkeypatch.setenv("DJANGO_TRUST_X_FORWARDED_PROTO", "1")
        configuration = runpy.run_path(str(SETTINGS_PATH))
        with override_settings(
            ALLOWED_HOSTS=configuration["ALLOWED_HOSTS"],
            SECURE_SSL_REDIRECT=configuration["SECURE_SSL_REDIRECT"],
            SECURE_PROXY_SSL_HEADER=configuration["SECURE_PROXY_SSL_HEADER"],
            SECURE_HSTS_SECONDS=configuration["SECURE_HSTS_SECONDS"],
            CSRF_COOKIE_SECURE=configuration["CSRF_COOKIE_SECURE"],
        ):
            # Act
            response = Client().get(
                reverse("get_current_user"),
                HTTP_HOST=TEST_HOST,
                HTTP_X_FORWARDED_PROTO="https",
            )

        # Assert
        assert response.status_code == 200
        assert response.cookies["csrftoken"]["secure"] is True
        assert response.cookies["csrftoken"]["httponly"] == ""
        assert response["Strict-Transport-Security"] == "max-age=3600"

    @pytest.mark.django_db
    def test_https_login_sets_secure_http_only_session_cookie(self) -> None:
        # Arrange
        get_user_model().objects.create_user(
            username="security-test", email="ana@example.com", password="senha-segura"
        )
        configuration = runpy.run_path(str(SETTINGS_PATH))
        client = APIClient(enforce_csrf_checks=True)
        with override_settings(
            ALLOWED_HOSTS=configuration["ALLOWED_HOSTS"],
            SECURE_SSL_REDIRECT=configuration["SECURE_SSL_REDIRECT"],
            CSRF_COOKIE_SECURE=configuration["CSRF_COOKIE_SECURE"],
            SESSION_COOKIE_SECURE=configuration["SESSION_COOKIE_SECURE"],
        ):
            client.get(reverse("get_current_user"), secure=True, HTTP_HOST=TEST_HOST)

            # Act
            response = client.post(
                reverse("login_user"),
                {"email": "ana@example.com", "password": "senha-segura"},
                secure=True,
                HTTP_HOST=TEST_HOST,
                HTTP_REFERER=f"https://{TEST_HOST}/entrar",
                HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
            )

        # Assert
        assert response.status_code == 200
        assert response.cookies["sessionid"]["secure"] is True
        assert response.cookies["sessionid"]["httponly"] is True
        assert response.cookies["sessionid"]["samesite"] == "Lax"
