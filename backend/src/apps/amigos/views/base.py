"""Shared access rules for friend endpoints."""

from typing import cast

from django.contrib.auth.models import User
from django.db.models import QuerySet
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.amigos.models import Amigo


class BaseAPIView(APIView):
    """Require login, throttle requests, and scope friends to the owner."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "amigos"

    def get_queryset(self) -> QuerySet[Amigo]:
        """Return only friends owned by the authenticated user."""
        return Amigo.objects.filter(owner=self.get_owner())

    def get_owner(self) -> User:
        """Return the user already authenticated by the view permission."""
        return cast(User, self.request.user)
