"""Read and write contracts for friends on the board."""

from datetime import date
from typing import ClassVar, cast

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.friends.models import Friend, Group
from apps.friends.services.board import Column
from apps.friends.services.friends import BoardFriend


class FriendWriteSerializer(serializers.Serializer):
    """Validate friend fields and restrict group IDs to the authenticated owner."""

    name = serializers.CharField(max_length=100)
    cadence_amount = serializers.IntegerField(min_value=1)
    cadence_unit = serializers.ChoiceField(choices=Friend.CadenceUnit.choices)
    BIRTHDAY_VALIDATION_YEAR: ClassVar[int] = 2000
    BIRTHDAY_ERROR: ClassVar[str] = (
        "Aniversário inválido. Informe uma data no formato dd/mm ou null para limpar."
    )
    birthday = serializers.RegexField(
        regex=r"\A[0-9]{2}/[0-9]{2}\Z",
        required=False,
        allow_null=True,
        trim_whitespace=False,
        error_messages={"invalid": BIRTHDAY_ERROR, "blank": BIRTHDAY_ERROR},
    )

    def validate_birthday(self, value: str | None) -> date | None:
        """Return a validated date or None; the leap year is only for validation.

        The service stores only day and month. Using a leap year allows 29/02
        without collecting or persisting a birth year.
        """
        if value is None:
            return None
        try:
            return date(self.BIRTHDAY_VALIDATION_YEAR, int(value[3:]), int(value[:2]))
        except ValueError as error:
            raise serializers.ValidationError(self.BIRTHDAY_ERROR) from error

    def get_fields(self) -> dict[str, serializers.Field]:
        """Build fields with a group queryset scoped to the current owner."""
        fields = super().get_fields()
        owner = cast(User, self.context["owner"])
        fields["groups"] = serializers.PrimaryKeyRelatedField(
            many=True, queryset=Group.objects.filter(owner=owner), required=False
        )
        return fields


class FriendGroupSerializer(serializers.ModelSerializer[Group]):
    """Expose the group fields displayed with a friend."""

    class Meta:
        model = Group
        fields = ("id", "name", "color")


class BoardFriendSerializer(serializers.Serializer):
    """Expose a friend and the board fields computed by FriendsService."""

    id = serializers.UUIDField(source="friend.id")
    name = serializers.CharField(source="friend.name")
    cadence_amount = serializers.IntegerField(source="friend.cadence_amount")
    cadence_unit = serializers.CharField(source="friend.cadence_unit")
    column = serializers.ChoiceField(choices=Column.choices)
    last_contact_at = serializers.DateTimeField(allow_null=True, source="last_contact")
    last_note = serializers.CharField(allow_null=True, allow_blank=True)
    groups = FriendGroupSerializer(source="friend.groups", many=True)
    birthday = serializers.SerializerMethodField()
    is_birthday_today = serializers.BooleanField(read_only=True)

    def get_birthday(self, board_friend: BoardFriend) -> str | None:
        """Return the stored birthday as dd/mm, or None when it is absent."""
        friend = board_friend.friend
        if friend.birthday_day is None or friend.birthday_month is None:
            return None
        return f"{friend.birthday_day:02d}/{friend.birthday_month:02d}"
