"""Django registration for the user accounts domain."""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Register the accounts app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
