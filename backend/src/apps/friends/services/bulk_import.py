"""Import selected address-book entries without changing existing friends."""

from dataclasses import dataclass
from datetime import date
from typing import NotRequired, TypedDict
from uuid import UUID

from django.contrib.auth.models import User
from django.db import models, transaction
from django.db.models import Q, QuerySet
from rest_framework.exceptions import ValidationError

from apps.friends.models import Friend
from apps.friends.services.friends import BoardFriend, FriendsService


class FriendImportData(TypedDict):
    """Personal fields validated by the import serializer; defaults belong here."""

    name: str
    phone: NotRequired[str | None]
    birthday: NotRequired[date | None]


class ImportIgnoreReason(models.TextChoices):
    EXISTING_PHONE = "existing_phone", "Telefone já cadastrado"
    DUPLICATE_PHONE = "duplicate_phone", "Telefone repetido no lote"


@dataclass(frozen=True)
class ImportedFriend:
    """Created friend correlated to a zero-based position in the submitted list."""

    index: int
    friend: BoardFriend


@dataclass(frozen=True)
class IgnoredFriend:
    """Skipped position and the owned friend that already uses its phone."""

    index: int
    reason: ImportIgnoreReason
    friend_id: UUID


@dataclass(frozen=True)
class FriendImportResult:
    """Confirmed creations and ignored positions; never inferred from row counts."""

    created: list[ImportedFriend]
    ignored: list[IgnoredFriend]


class FriendBulkImportService:
    """Insert a validated list atomically, with owner-scoped phone deduplication.

    The serializer validates the entire list before this use case starts. Django's
    bulk_create bypasses save/full_clean; callers must supply validated fields.
    Generated UUIDs are checked in the database because ignore_conflicts does not
    report which objects were inserted. A concurrent phone winner is ignored.
    """

    MAX_FRIENDS = 5_000
    DEFAULT_CADENCE_AMOUNT = 1

    def __init__(self, friends_for_owner: QuerySet[Friend], owner: User) -> None:
        self.friends_for_owner = friends_for_owner
        self.owner = owner

    @transaction.atomic
    def import_friends_for_owner(
        self, friends_data: list[FriendImportData]
    ) -> FriendImportResult:
        """Create new friends in input order and ignore canonical phone repeats.

        Friends without a phone are distinct, even when names match. Existing
        friends are never updated. Invalid fields reject the whole request in the
        serializer; any database or response-building failure rolls back writes.
        """
        if not 0 < len(friends_data) <= self.MAX_FRIENDS:
            raise ValidationError(
                {"friends": f"Selecione entre 1 e {self.MAX_FRIENDS} amigos."}
            )
        first_index_by_phone: dict[str, int] = {}
        attempted_friends: dict[int, Friend] = {}
        for index, friend_data in enumerate(friends_data):
            phone = friend_data.get("phone")
            if phone is not None:
                if phone in first_index_by_phone:
                    continue
                first_index_by_phone[phone] = index
            birthday = friend_data.get("birthday")
            attempted_friends[index] = Friend(
                owner=self.owner,
                name=friend_data["name"],
                phone=phone,
                birthday_day=birthday.day if birthday else None,
                birthday_month=birthday.month if birthday else None,
                cadence_amount=self.DEFAULT_CADENCE_AMOUNT,
                cadence_unit=Friend.CadenceUnit.MONTH,
            )
        # PostgreSQL locks conflicting index entries in insertion order. Sort
        # phones so overlapping imports in opposite input orders cannot deadlock.
        friends_to_create = sorted(
            attempted_friends.values(), key=lambda friend: friend.phone or ""
        )
        Friend.objects.bulk_create(friends_to_create, ignore_conflicts=True)
        persisted_friends = list(
            self.friends_for_owner.filter(
                Q(pk__in=[friend.id for friend in friends_to_create])
                | Q(phone__in=first_index_by_phone)
            )
        )
        persisted_ids = {friend.id for friend in persisted_friends}
        persisted_friends_by_phone = {
            friend.phone: friend for friend in persisted_friends if friend.phone
        }
        created_ids = {
            friend.id for friend in friends_to_create if friend.id in persisted_ids
        }
        board_friends_by_id = {
            friend.friend.id: friend
            for friend in FriendsService(
                self.friends_for_owner.filter(pk__in=created_ids), self.owner
            ).list_friends()
        }
        created: list[ImportedFriend] = []
        ignored: list[IgnoredFriend] = []
        for index, friend_data in enumerate(friends_data):
            attempted_friend = attempted_friends.get(index)
            if attempted_friend and attempted_friend.id in created_ids:
                created.append(
                    ImportedFriend(
                        index=index, friend=board_friends_by_id[attempted_friend.id]
                    )
                )
                continue
            phone = friend_data.get("phone")
            existing_friend = persisted_friends_by_phone.get(phone) if phone else None
            if phone is None or existing_friend is None:
                # A competing deletion must not become a fictional success.
                raise ValidationError(
                    "Um amigo foi alterado durante a importação. "
                    "Confira a lista e tente novamente."
                )
            reason = (
                ImportIgnoreReason.DUPLICATE_PHONE
                if first_index_by_phone[phone] != index
                else ImportIgnoreReason.EXISTING_PHONE
            )
            ignored.append(
                IgnoredFriend(index=index, reason=reason, friend_id=existing_friend.id)
            )
        return FriendImportResult(created=created, ignored=ignored)
