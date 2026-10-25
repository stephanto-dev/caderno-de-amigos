"""Record and undo contacts for friends owned by the current user."""

from dataclasses import dataclass

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from apps.friends.models import Contact, Friend
from apps.friends.services.friends import BoardFriend, FriendsService


@dataclass(frozen=True)
class RecordedContact:
    """The updated friend and the new contact ID needed to undo the action."""

    board_friend: BoardFriend
    contact_id: int


class ContactsService:
    """Change contact history only for friends belonging to the owner."""

    def __init__(self, owner: User) -> None:
        self.owner = owner

    def record_contact(self, friend_id: int, kind: str, note: str) -> RecordedContact:
        """Record a contact now and return its ID with recalculated board fields."""
        friends_for_owner = Friend.objects.filter(owner=self.owner)
        friend = get_object_or_404(friends_for_owner, pk=friend_id)
        contact = Contact.objects.create(friend=friend, kind=kind, note=note)
        return RecordedContact(
            board_friend=FriendsService(
                friends_for_owner, self.owner
            ).get_friend_for_owner(friend_id),
            contact_id=contact.id,
        )

    def undo_contact(self, friend_id: int, contact_id: int) -> None:
        """Delete a contact only when it belongs to a friend owned by this user."""
        friend = get_object_or_404(
            Friend.objects.filter(owner=self.owner), pk=friend_id
        )
        contact = get_object_or_404(
            Contact.objects.filter(friend=friend), pk=contact_id
        )
        contact.delete()
