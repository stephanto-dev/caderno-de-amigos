"""Read friends with the data needed by the board."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar, TypedDict

from django.contrib.auth.models import User
from django.db.models import Max, OuterRef, Prefetch, QuerySet, Subquery
from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.friends.models import Contact, Friend, Group
from apps.friends.services.board import BoardService, Column

if TYPE_CHECKING:
    from django_stubs_ext import WithAnnotations


class BoardComputedFields(TypedDict):
    """Fields added to each friend by the board query."""

    last_contact: datetime | None
    last_note: str | None


@dataclass(frozen=True)
class BoardFriend:
    """A friend and the computed fields shown in the board API."""

    friend: Friend
    column: Column
    last_contact: datetime | None
    last_note: str | None


class FriendsService:
    """Build board data from the view's owner-scoped friend queryset."""

    COLUMN_ORDER: ClassVar[dict[Column, int]] = {
        Column.OVERDUE: 0,
        Column.THIS_WEEK: 1,
        Column.ON_TRACK: 2,
        Column.JUST_TALKED: 3,
    }

    def __init__(self, friends_for_owner: QuerySet[Friend], owner: User) -> None:
        self.friends_for_owner = friends_for_owner
        self.owner = owner

    def list_friends(self) -> list[BoardFriend]:
        """Return owner-scoped friends with board fields, sorted by urgency."""
        friends = [
            self._build_board_friend(friend)
            for friend in self._get_friends_with_board_fields()
        ]
        return sorted(friends, key=self._get_sort_key_for_friend)

    def get_friend_for_owner(self, friend_id: int) -> BoardFriend:
        """Return one scoped friend or raise 404 if absent or owned by another user."""
        friend = get_object_or_404(self._get_friends_with_board_fields(), pk=friend_id)
        return self._build_board_friend(friend)

    def _get_friends_with_board_fields(
        self,
    ) -> QuerySet[WithAnnotations[Friend, BoardComputedFields]]:
        most_recent_contact = (
            Contact.objects.filter(friend=OuterRef("pk"))
            .order_by("-date", "-id")
            .values("note")[:1]
        )
        return self.friends_for_owner.annotate(
            last_contact=Max("contacts__date"),
            last_note=Subquery(most_recent_contact),
        ).prefetch_related(
            Prefetch(
                "groups",
                # The model allows cross-owner links; the API must not expose them.
                queryset=Group.objects.filter(owner=self.owner).order_by(
                    Lower("name"), "id"
                ),
            )
        )

    def _build_board_friend(
        self, friend: WithAnnotations[Friend, BoardComputedFields]
    ) -> BoardFriend:
        last_contact = friend.last_contact
        return BoardFriend(
            friend=friend,
            column=BoardService().calculate_column(friend, last_contact),
            last_contact=last_contact,
            last_note=friend.last_note,
        )

    def _get_sort_key_for_friend(
        self, board_friend: BoardFriend
    ) -> tuple[int, int, float, str]:
        friend = board_friend.friend
        last_contact = board_friend.last_contact
        column_order = self.COLUMN_ORDER[board_friend.column]
        name = friend.name.casefold()
        if last_contact is None:
            return column_order, 0, 0, name

        days_since_contact = BoardService.get_days_since_contact(last_contact)
        cadence_in_days = BoardService.get_cadence_in_days(friend)
        if board_friend.column == Column.OVERDUE:
            return column_order, 1, -days_since_contact / cadence_in_days, name
        if board_friend.column == Column.JUST_TALKED:
            return column_order, 0, -last_contact.timestamp(), name
        return column_order, 0, cadence_in_days - days_since_contact, name
