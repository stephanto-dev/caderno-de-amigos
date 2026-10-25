"""Endpoints for recording and undoing contacts."""

from typing import cast
from uuid import UUID

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from apps.friends.serializers.contact import ContactWriteSerializer
from apps.friends.serializers.friend import BoardFriendSerializer
from apps.friends.services.contacts import ContactsService
from apps.friends.views.base import BaseAPIView


class RecordContactView(BaseAPIView):
    """Record a contact for an owned friend."""

    def post(self, request: Request, friend_id: UUID) -> Response:
        """Validate the contact and return the updated board representation."""
        serializer = ContactWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recorded_contact = ContactsService(self.get_owner()).record_contact(
            friend_id=friend_id,
            kind=cast(str, serializer.validated_data["kind"]),
            note=cast(str, serializer.validated_data.get("note", "")),
        )
        return Response(
            {
                **BoardFriendSerializer(recorded_contact.board_friend).data,
                "contact_id": str(recorded_contact.contact_id),
            },
            status=status.HTTP_201_CREATED,
        )


class UndoContactView(BaseAPIView):
    """Remove one contact from an owned friend."""

    def delete(self, request: Request, friend_id: UUID, contact_id: UUID) -> Response:
        """Delete the contact and return an empty successful response."""
        ContactsService(self.get_owner()).undo_contact(friend_id, contact_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
