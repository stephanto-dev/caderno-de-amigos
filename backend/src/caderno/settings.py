"""Django settings for the Caderno de amigos backend."""

from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from caderno.env_vars import EnvironmentSettings

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
ENV = EnvironmentSettings()

DEBUG = ENV.django_debug
SECRET_KEY = ENV.django_secret_key.get_secret_value() if ENV.django_secret_key else ""
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("Defina DJANGO_SECRET_KEY no ambiente de produção.")
    SECRET_KEY = "development-only-secret-key"

POSTGRES_PASSWORD = (
    ENV.postgres_password.get_secret_value() if ENV.postgres_password else ""
)
if not POSTGRES_PASSWORD and not DEBUG:
    raise ImproperlyConfigured("Defina POSTGRES_PASSWORD no ambiente de produção.")

ALLOWED_HOSTS = ENV.django_allowed_hosts.split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_standardized_errors",
    "apps.amigos",
    "apps.contas",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "caderno.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [FRONTEND_DIST],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
WSGI_APPLICATION = "caderno.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": ENV.postgres_db,
        "USER": ENV.postgres_user,
        "PASSWORD": POSTGRES_PASSWORD or "caderno",
        "HOST": ENV.postgres_host,
        "PORT": ENV.postgres_port,
    }
}

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [FRONTEND_DIST] if FRONTEND_DIST.is_dir() else []
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    # shortcut: cache is per worker; use shared cache when scaling.
    "DEFAULT_THROTTLE_RATES": {"login": "5/min"},
    "EXCEPTION_HANDLER": "drf_standardized_errors.handler.exception_handler",
}

DRF_STANDARDIZED_ERRORS = {"ENABLE_IN_DEBUG_FOR_UNHANDLED_EXCEPTIONS": True}
