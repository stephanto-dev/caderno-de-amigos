"""Django registration for the user accounts domain."""

from django.apps import AppConfig


class ContasConfig(AppConfig):
    """Register the accounts app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.contas"
