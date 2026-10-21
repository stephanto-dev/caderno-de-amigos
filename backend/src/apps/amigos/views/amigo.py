"""Read endpoints for friends."""

from rest_framework.request import Request
from rest_framework.response import Response

from apps.amigos.serializers.amigo import AmigoDoQuadroSerializer
from apps.amigos.services.amigos import AmigosService
from apps.amigos.views.base import BaseAPIView


class AmigosListView(BaseAPIView):
    """Return the authenticated owner's board-ready friend list."""

    def get(self, request: Request) -> Response:
        """Return friends in board and urgency order."""
        amigos = AmigosService(self.get_queryset(), self.get_owner()).listar_amigos()
        return Response(AmigoDoQuadroSerializer(amigos, many=True).data)


class AmigoDetailView(BaseAPIView):
    """Return one friend when it belongs to the authenticated owner."""

    def get(self, request: Request, amigo_id: int) -> Response:
        """Return board-ready details for one friend."""
        amigo = AmigosService(
            self.get_queryset(), self.get_owner()
        ).get_amigo_for_owner(amigo_id)
        return Response(AmigoDoQuadroSerializer(amigo).data)
