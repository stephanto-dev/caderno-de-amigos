"""Django registration for the friends domain."""

from django.apps import AppConfig


class FriendsConfig(AppConfig):
    """Register the friends app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.friends"
