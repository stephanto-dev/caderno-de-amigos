"""Input and output contracts for session endpoints."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """Validate the credentials sent by the browser."""

    usuario = serializers.CharField()
    senha = serializers.CharField(write_only=True)


class SessionStatusSerializer(serializers.Serializer):
    """Show whether a browser session identifies a user."""

    autenticado = serializers.BooleanField(source="is_authenticated")
    usuario = serializers.SerializerMethodField()

    def get_usuario(self, user: AbstractBaseUser | AnonymousUser) -> str | None:
        """Return the account name only when the session is authenticated."""
        return user.get_username() if user.is_authenticated else None
