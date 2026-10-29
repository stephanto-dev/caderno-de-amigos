"""Endpoint for registering an email account."""

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers.session import (
    RegisterSerializer,
    SessionStatusSerializer,
)
from apps.accounts.services.session import SessionService
from apps.accounts.throttling import AccountIPRateThrottle


# SessionAuthentication does not enforce CSRF for anonymous requests.
@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    """Create an email account and start its session after CSRF validation."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AccountIPRateThrottle]
    throttle_scope = "register"

    def post(self, request: Request) -> Response:
        """Register valid credentials and return the new session status."""
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email: str = serializer.validated_data["email"]
        password: str = serializer.validated_data["password"]
        user = SessionService(request._request).register_user(email, password)
        return Response(
            SessionStatusSerializer(user).data, status=status.HTTP_201_CREATED
        )
