"""Register email accounts and manage Django user sessions."""

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.http import HttpRequest
from rest_framework.exceptions import ValidationError


class SessionService:
    """Use Django's user model and session for email-based account access."""

    DUPLICATE_EMAIL_MESSAGE = "Este e-mail já tem conta."

    def __init__(self, request: HttpRequest) -> None:
        self.request = request

    def login_user(self, email: str, password: str) -> AbstractBaseUser | None:
        """Create a session for a valid email and password, including older users."""
        account = User.objects.filter(email__iexact=email).first()
        user = authenticate(
            self.request,
            username=account.username if account is not None else email,
            password=password,
        )
        if user is not None:
            login(self.request, user)
        return user

    def register_user(self, email: str, password: str) -> User:
        """Create a lowercase email account and start its browser session.

        Raises:
            ValidationError: An account already uses the email.
        """
        normalized_email = email.lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise ValidationError({"email": self.DUPLICATE_EMAIL_MESSAGE})

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=normalized_email, email=normalized_email, password=password
                )
        except IntegrityError as error:
            # Django's unique username also catches concurrent email registrations.
            if not User.objects.filter(username=normalized_email).exists():
                raise
            raise ValidationError({"email": self.DUPLICATE_EMAIL_MESSAGE}) from error

        login(self.request, user)
        return user

    def logout_user(self) -> None:
        """End the current user's session."""
        logout(self.request)
