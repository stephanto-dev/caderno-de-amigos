"""Endpoint for creating a browser session."""

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.serializers.session import LoginSerializer, SessionStatusSerializer
from apps.accounts.services.session import SessionService


# SessionAuthentication does not enforce CSRF for anonymous requests.
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    """Create a session after checking credentials and the CSRF token."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request: Request) -> Response:
        """Authenticate a user and return the new session status."""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario: str = serializer.validated_data["usuario"]
        senha: str = serializer.validated_data["senha"]

        user = SessionService(request._request).login_user(usuario, senha)
        if user is None:
            raise ValidationError("Usuário ou senha inválidos.")

        return Response(SessionStatusSerializer(user).data)
