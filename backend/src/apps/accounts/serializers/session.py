"""Input and output contracts for session endpoints."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser, User
from rest_framework import serializers

MIN_PASSWORD_LENGTH = 8
# Django's default User.username stores the normalized email and has this limit.
MAX_ACCOUNT_EMAIL_LENGTH = 150


class LoginSerializer(serializers.Serializer):
    """Validate the credentials sent by the browser."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    """Validate an email account and its confirmed minimum-length password."""

    email = serializers.EmailField(
        max_length=MAX_ACCOUNT_EMAIL_LENGTH,
        error_messages={
            "max_length": (
                f"O e-mail precisa ter no máximo {MAX_ACCOUNT_EMAIL_LENGTH} caracteres."
            )
        },
    )
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate_password(self, password: str) -> str:
        """Reject passwords shorter than the product's minimum."""
        if len(password) < MIN_PASSWORD_LENGTH:
            raise serializers.ValidationError(
                f"A senha precisa ter pelo menos {MIN_PASSWORD_LENGTH} caracteres."
            )
        return password

    def validate(self, attrs: dict[str, str]) -> dict[str, str]:
        """Require confirmation to match the submitted password."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "As senhas não são iguais."}
            )
        return attrs


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
