"""API representation of a group."""

from rest_framework import serializers

from apps.friends.models import Group


class GroupWriteSerializer(serializers.Serializer):
    """Validate fields accepted when creating or editing a group."""

    name = serializers.CharField(max_length=100)
    color = serializers.ChoiceField(choices=Group.Color.choices)


class GroupReadSerializer(serializers.ModelSerializer[Group]):
    """Expose the group and its annotated number of friends."""

    friends_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = ("id", "name", "color", "friends_count")
