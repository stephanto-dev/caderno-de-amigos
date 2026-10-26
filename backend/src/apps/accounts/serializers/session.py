"""Input and output contracts for session endpoints."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser, User
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """Validate the credentials sent by the browser."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class SessionStatusSerializer(serializers.Serializer):
    """Show whether a browser session identifies a user and their email."""

    authenticated = serializers.BooleanField(source="is_authenticated")
    user = serializers.SerializerMethodField()
    # CRM-19 needs the real email; user remains the login name for existing clients.
    email = serializers.SerializerMethodField()

    def get_user(self, user: AbstractBaseUser | AnonymousUser) -> str | None:
        """Return the account name only when the session is authenticated."""
        return user.get_username() if user.is_authenticated else None

    def get_email(self, user: User | AnonymousUser) -> str | None:
        """Return the account email only when the session is authenticated."""
        return user.email if isinstance(user, User) else None
