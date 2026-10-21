"""Create and end Django user sessions."""

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.base_user import AbstractBaseUser
from django.http import HttpRequest


class SessionService:
    """Use Django's authentication backend and session for account access."""

    def __init__(self, request: HttpRequest) -> None:
        self.request = request

    def login_user(self, usuario: str, senha: str) -> AbstractBaseUser | None:
        """Create a session for valid credentials and return its user."""
        user = authenticate(self.request, username=usuario, password=senha)
        if user is not None:
            login(self.request, user)
        return user

    def logout_user(self) -> None:
        """End the current user's session."""
        logout(self.request)
