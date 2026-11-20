"""Endpoints for reading, recording and undoing contacts."""

from datetime import date
from typing import cast
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

from rest_framework import status
from rest_framework.pagination import CursorPagination
from rest_framework.request import Request
from rest_framework.response import Response

from apps.friends.serializers.contact import (
    ContactBatchWriteSerializer,
    ContactReadSerializer,
    ContactWriteSerializer,
)
from apps.friends.serializers.friend import BoardFriendSerializer
from apps.friends.services.contacts import ContactsService, RecordedContact
from apps.friends.views.base import BaseAPIView


def _build_recorded_contact_for_response(
    recorded_contact: RecordedContact,
) -> dict[str, object]:
    """Return one participant with the same shape as a single-contact response."""
    return {
        **BoardFriendSerializer(recorded_contact.board_friend).data,
        "contact_id": str(recorded_contact.contact.id),
        "contact": ContactReadSerializer(recorded_contact.contact).data,
    }


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
            contact_date=cast(date | None, serializer.validated_data.get("date")),
        )
        return Response(
            _build_recorded_contact_for_response(recorded_contact),
            status=status.HTTP_201_CREATED,
        )


class RecordContactBatchView(BaseAPIView):
    """Record one interaction for the selected friends."""

    def post(self, request: Request) -> Response:
        """Return the shared undo ID and the saved history and board for each friend."""
        serializer = ContactBatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = ContactsService(self.get_owner()).record_contact_batch(
            friend_ids=cast(list[UUID], serializer.validated_data["friend_ids"]),
            kind=cast(str, serializer.validated_data["kind"]),
            note=cast(str, serializer.validated_data.get("note", "")),
            contact_date=cast(date | None, serializer.validated_data.get("date")),
        )
        return Response(
            {
                "batch_id": str(batch.id),
                "contacts": [
                    _build_recorded_contact_for_response(contact)
                    for contact in batch.contacts
                ],
            },
            status=status.HTTP_201_CREATED,
        )


class UndoContactView(BaseAPIView):
    """Remove one contact from an owned friend."""

    def delete(self, request: Request, friend_id: UUID, contact_id: UUID) -> Response:
        """Delete the contact and return an empty successful response."""
        ContactsService(self.get_owner()).undo_contact(friend_id, contact_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UndoContactBatchView(BaseAPIView):
    """Undo one interaction for all of its owned participants."""

    def delete(self, request: Request, batch_id: UUID) -> Response:
        """Remove the interaction from each participant's history."""
        ContactsService(self.get_owner()).undo_contact_batch(batch_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
