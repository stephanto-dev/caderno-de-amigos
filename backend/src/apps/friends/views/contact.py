"""Endpoints for reading, recording and undoing contacts."""

from typing import cast
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

from rest_framework import status
from rest_framework.pagination import CursorPagination
from rest_framework.request import Request
from rest_framework.response import Response

from apps.friends.serializers.contact import (
    ContactReadSerializer,
    ContactWriteSerializer,
)
from apps.friends.serializers.friend import BoardFriendSerializer
from apps.friends.services.contacts import ContactsService
from apps.friends.views.base import BaseAPIView


class ContactCursorPagination(CursorPagination):
    """Page contact history with a cursor token rather than a next-page URL."""

    page_size = 20
    ordering = ("-date", "-id")
    invalid_cursor_message = (
        "Cursor inválido. Recarregue o histórico para começar pela primeira página."
    )

    def get_paginated_response(self, data: object) -> Response:
        """Return only the continuation token and serialized contacts."""
        next_link = self.get_next_link()
        next_cursor = (
            parse_qs(urlsplit(next_link).query)[self.cursor_query_param][0]
            if next_link is not None
            else None
        )
        return Response({"next": next_cursor, "results": data})


class RecordContactView(BaseAPIView):
    """Read and record contacts for an owned friend."""

    def get(self, request: Request, friend_id: UUID) -> Response:
        """Return one page of contacts, newest first, for the authenticated owner."""
        contacts = ContactsService(self.get_owner()).get_contacts_for_owner(friend_id)
        pagination = ContactCursorPagination()
        page = pagination.paginate_queryset(contacts, request, view=self)
        return pagination.get_paginated_response(
            ContactReadSerializer(page, many=True).data
        )

    def post(self, request: Request, friend_id: UUID) -> Response:
        """Return the saved contact alongside the updated board representation."""
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
                "contact_id": str(recorded_contact.contact.id),
                "contact": ContactReadSerializer(recorded_contact.contact).data,
            },
            status=status.HTTP_201_CREATED,
        )


class UndoContactView(BaseAPIView):
    """Remove one contact from an owned friend."""

    def delete(self, request: Request, friend_id: UUID, contact_id: UUID) -> Response:
        """Delete the contact and return an empty successful response."""
        ContactsService(self.get_owner()).undo_contact(friend_id, contact_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
