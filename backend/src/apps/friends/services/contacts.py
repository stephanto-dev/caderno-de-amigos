"""Read, record and undo contacts for friends owned by the current user."""

from dataclasses import dataclass
from datetime import date, datetime, time
from uuid import UUID, uuid4

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import QuerySet
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.friends.models import Contact, Friend
from apps.friends.services.friends import BoardFriend, FriendsService


@dataclass(frozen=True)
class RecordedContact:
    """The updated friend and the newly saved contact."""

    board_friend: BoardFriend
    contact: Contact


@dataclass(frozen=True)
class RecordedContactBatch:
    """One interaction and the saved history entries for its participants."""

    id: UUID
    contacts: list[RecordedContact]


class ContactsService:
    """Read and change contact history only for friends belonging to the owner."""

    def __init__(self, owner: User) -> None:
        self.owner = owner

    def get_contacts_for_owner(self, friend_id: UUID) -> QuerySet[Contact]:
        """Return a friend's history, or 404 if the friend is not owned by this user.

        Check the friend before querying contacts so an empty history remains
        distinguishable from an unknown or inaccessible friend.
        """
        friend = get_object_or_404(
            Friend.objects.filter(owner=self.owner), pk=friend_id
        )
        return Contact.objects.filter(friend=friend)

    def record_contact(
        self, friend_id: UUID, kind: str, note: str, contact_date: date | None = None
    ) -> RecordedContact:
        """Record a contact for one friend and return their updated board fields."""
        return self._record_contacts_for_friends([friend_id], kind, note, contact_date)[
            0
        ]

    def record_contact_batch(
        self, friend_ids: list[UUID], kind: str, note: str, contact_date: date | None
    ) -> RecordedContactBatch:
        """Record the interaction once per participant, linked for a single undo."""
        batch_id = uuid4()
        return RecordedContactBatch(
            id=batch_id,
            contacts=self._record_contacts_for_friends(
                friend_ids, kind, note, contact_date, batch_id
            ),
        )

    @transaction.atomic
    def _record_contacts_for_friends(
        self,
        friend_ids: list[UUID],
        kind: str,
        note: str,
        contact_date: date | None,
        batch_id: UUID | None = None,
    ) -> list[RecordedContact]:
        """Save all participants with a shared timestamp and return their board fields.

        Omitted dates and today retain the current time. Earlier calendar dates
        use local midnight because the form does not collect a time of day.
        Future dates are rejected before saving any contact.
        """
        participant_ids = list(dict.fromkeys(friend_ids))
        friends_for_owner = Friend.objects.filter(
            owner=self.owner, pk__in=participant_ids
        )
        participants = {
            friend.id: friend
            for friend in friends_for_owner.select_for_update().order_by("pk")
        }
        if len(participants) != len(participant_ids):
            raise Http404
        now = timezone.now()
        today = timezone.localdate(now)
        if contact_date is not None and contact_date > today:
            raise ValidationError(
                {
                    "date": (
                        "O contato não pode estar no futuro. "
                        "Escolha hoje ou um dia anterior."
                    )
                }
            )
        recorded_at = (
            timezone.make_aware(datetime.combine(contact_date, time.min))
            if contact_date is not None and contact_date < today
            else now
        )
        contacts = Contact.objects.bulk_create(
            [
                Contact(
                    friend=participants[friend_id],
                    kind=kind,
                    note=note,
                    date=recorded_at,
                    batch_id=batch_id,
                )
                for friend_id in participant_ids
            ]
        )
        board_friends = {
            friend.friend.id: friend
            for friend in FriendsService(friends_for_owner, self.owner).list_friends()
        }
        return [
            RecordedContact(
                board_friend=board_friends[contact.friend_id], contact=contact
            )
            for contact in contacts
        ]

    def undo_contact(self, friend_id: UUID, contact_id: UUID) -> None:
        """Delete a contact only when it belongs to a friend owned by this user."""
        friend = get_object_or_404(
            Friend.objects.filter(owner=self.owner), pk=friend_id
        )
        contact = get_object_or_404(
            Contact.objects.filter(friend=friend), pk=contact_id
        )
        contact.delete()

    def undo_contact_batch(self, batch_id: UUID) -> None:
        """Delete all history entries from the interaction owned by this user."""
        deleted_count, _ = Contact.objects.filter(
            friend__owner=self.owner, batch_id=batch_id
        ).delete()
        if not deleted_count:
            raise Http404
