"""Read, record and undo contacts for friends owned by the current user."""

from dataclasses import dataclass
from uuid import UUID

from django.contrib.auth.models import User
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404

from apps.friends.models import Contact, Friend
from apps.friends.services.friends import BoardFriend, FriendsService


@dataclass(frozen=True)
class RecordedContact:
    """The updated friend and the newly saved contact."""

    board_friend: BoardFriend
    contact: Contact


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

    def record_contact(self, friend_id: UUID, kind: str, note: str) -> RecordedContact:
        """Record a contact now and return it with recalculated board fields."""
        friends_for_owner = Friend.objects.filter(owner=self.owner)
        friend = get_object_or_404(friends_for_owner, pk=friend_id)
        contact = Contact.objects.create(friend=friend, kind=kind, note=note)
        return RecordedContact(
            board_friend=FriendsService(
                friends_for_owner, self.owner
            ).get_friend_for_owner(friend_id),
            contact=contact,
        )

    def undo_contact(self, friend_id: UUID, contact_id: UUID) -> None:
        """Delete a contact only when it belongs to a friend owned by this user."""
        friend = get_object_or_404(
            Friend.objects.filter(owner=self.owner), pk=friend_id
        )
        contact = get_object_or_404(
            Contact.objects.filter(friend=friend), pk=contact_id
        )
        contact.delete()
