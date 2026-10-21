"""Input and output contracts for session endpoints."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """Validate the credentials sent by the browser."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class SessionStatusSerializer(serializers.Serializer):
    """Show whether a browser session identifies a user."""

    authenticated = serializers.BooleanField(source="is_authenticated")
    user = serializers.SerializerMethodField()

    def get_user(self, user: AbstractBaseUser | AnonymousUser) -> str | None:
        """Return the account name only when the session is authenticated."""
        return user.get_username() if user.is_authenticated else None
