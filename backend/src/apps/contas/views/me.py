"""Endpoint for the browser's current session."""

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contas.serializers.session import SessionStatusSerializer


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """Return session status and make the CSRF cookie available to the browser."""

    permission_classes = [permissions.AllowAny]

    def get(self, request: Request) -> Response:
        """Return the current user's public session status."""
        return Response(SessionStatusSerializer(request.user).data)
