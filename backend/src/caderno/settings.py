"""Django settings for the Caderno de amigos backend."""

from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from caderno.env_vars import EnvironmentSettings

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
ENV = EnvironmentSettings()

DEVELOPMENT_SECRET_KEY = "development-only-secret-key"
DEVELOPMENT_DATABASE_PASSWORD = "caderno"
MIN_PRODUCTION_SECRET_KEY_LENGTH = 50
MIN_PRODUCTION_SECRET_KEY_UNIQUE_CHARACTERS = 5
INSECURE_SECRET_KEY_PREFIX = "django-insecure-"

DEBUG = ENV.django_debug
SECRET_KEY = ENV.django_secret_key.get_secret_value() if ENV.django_secret_key else ""
if DEBUG:
    SECRET_KEY = SECRET_KEY or DEVELOPMENT_SECRET_KEY
# Match Django's deployment check, refusing unsafe keys before serving requests.
elif (
    len(SECRET_KEY) < MIN_PRODUCTION_SECRET_KEY_LENGTH
    or len(set(SECRET_KEY)) < MIN_PRODUCTION_SECRET_KEY_UNIQUE_CHARACTERS
    or SECRET_KEY.startswith(INSECURE_SECRET_KEY_PREFIX)
):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY ausente ou insegura. Gere uma chave aleatória exclusiva "
        f"com pelo menos {MIN_PRODUCTION_SECRET_KEY_LENGTH} caracteres e defina-a "
        "no ambiente de produção."
    )

POSTGRES_PASSWORD = (
    ENV.postgres_password.get_secret_value() if ENV.postgres_password else ""
)
if not DEBUG and POSTGRES_PASSWORD in ("", DEVELOPMENT_DATABASE_PASSWORD):
    raise ImproperlyConfigured(
        "POSTGRES_PASSWORD ausente ou igual à senha do exemplo. "
        "Defina uma senha exclusiva no banco e no ambiente de produção."
    )

ALLOWED_HOSTS = [
    host.strip() for host in ENV.django_allowed_hosts.split(",") if host.strip()
]
if not DEBUG and (
    "django_allowed_hosts" not in ENV.model_fields_set
    or not ALLOWED_HOSTS
    or "*" in ALLOWED_HOSTS
):
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS ausente ou com '*'. "
        "Defina os domínios que este servidor pode atender, separados por vírgula."
    )

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 3600 if not DEBUG else 0
# Enable only when a controlled proxy overwrites the client-supplied header.
SECURE_PROXY_SSL_HEADER = (
    ("HTTP_X_FORWARDED_PROTO", "https") if ENV.django_trust_x_forwarded_proto else None
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_standardized_errors",
    "apps.friends",
    "apps.accounts",
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
        "PASSWORD": POSTGRES_PASSWORD or DEVELOPMENT_DATABASE_PASSWORD,
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
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",
        "register": "5/min",
        "friends": "60/min",
    },
    "EXCEPTION_HANDLER": "drf_standardized_errors.handler.exception_handler",
}

DRF_STANDARDIZED_ERRORS = {"ENABLE_IN_DEBUG_FOR_UNHANDLED_EXCEPTIONS": True}
