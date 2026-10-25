"""Read and write contracts for friends on the board."""

from typing import cast

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.friends.models import Friend, Group
from apps.friends.services.board import Column


class FriendWriteSerializer(serializers.Serializer):
    """Validate friend fields and restrict group IDs to the authenticated owner."""

    name = serializers.CharField(max_length=100)
    cadence_amount = serializers.IntegerField(min_value=1)
    cadence_unit = serializers.ChoiceField(choices=Friend.CadenceUnit.choices)

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
