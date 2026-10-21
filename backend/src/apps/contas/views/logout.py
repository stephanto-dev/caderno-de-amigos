"""Endpoint for ending a browser session."""

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contas.services.session import SessionService


class LogoutView(APIView):
    """End the authenticated browser session."""

    def post(self, request: Request) -> Response:
        """Invalidate the session cookie and return no content."""
        SessionService(request._request).logout_user()
        return Response(status=status.HTTP_204_NO_CONTENT)
