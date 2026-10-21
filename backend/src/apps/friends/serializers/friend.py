"""Read-only representation of a friend on the board."""

from rest_framework import serializers

from apps.friends.models import Group
from apps.friends.services.board import Column


class FriendGroupSerializer(serializers.ModelSerializer[Group]):
    """Expose the group fields displayed with a friend."""

    class Meta:
        model = Group
        fields = ("id", "name", "color")


class BoardFriendSerializer(serializers.Serializer):
    """Expose a friend and the board fields computed by FriendsService."""

    id = serializers.IntegerField(source="friend.id")
    name = serializers.CharField(source="friend.name")
    cadence_amount = serializers.IntegerField(source="friend.cadence_amount")
    cadence_unit = serializers.CharField(source="friend.cadence_unit")
    column = serializers.ChoiceField(choices=Column.choices)
    last_contact = serializers.DateTimeField(allow_null=True)
    last_note = serializers.CharField(allow_null=True, allow_blank=True)
    groups = FriendGroupSerializer(source="friend.groups", many=True)
