"""Read and write groups belonging to the authenticated owner."""

from typing import NotRequired, TypedDict

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Count, QuerySet
from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.friends.models import Group
from apps.friends.models.group import GROUP_NAME_UNIQUE_CONSTRAINT


class GroupCreateData(TypedDict):
    """Validated fields required to create a group."""

    name: str
    color: str


class GroupUpdateData(TypedDict):
    """Validated group fields supplied in a partial update."""

    name: NotRequired[str]
    color: NotRequired[str]


class GroupsService:
    """List, create, edit, and delete the owner's groups."""

    DUPLICATE_NAME_MESSAGE = "Você já tem um grupo com esse nome."

    def __init__(self, owner: User) -> None:
        self.owner = owner

    def list_groups_for_owner(self) -> QuerySet[Group]:
        """Return owned groups and friend counts in case-insensitive name order."""
        return (
            Group.objects.filter(owner=self.owner)
            .annotate(friends_count=Count("friends"))
            .order_by(Lower("name"), "id")
        )

    def create_group_for_owner(self, group_data: GroupCreateData) -> Group:
        """Create one owned group and reject a case-insensitive duplicate name.

        Raises:
            ValidationError: The owner already has a group with this name.
        """
        if Group.objects.filter(
            owner=self.owner, name__iexact=group_data["name"]
        ).exists():
            raise ValidationError({"name": self.DUPLICATE_NAME_MESSAGE})

        try:
            with transaction.atomic():
                group = Group.objects.create(owner=self.owner, **group_data)
        except IntegrityError as error:
            # The constraint also catches concurrent requests after the pre-check.
            if GROUP_NAME_UNIQUE_CONSTRAINT not in str(error):
                raise
            raise ValidationError({"name": self.DUPLICATE_NAME_MESSAGE}) from error

        return self._get_group_for_owner(group.pk)

    def update_group_for_owner(
        self, group_id: int, group_data: GroupUpdateData
    ) -> Group:
        """Update only supplied fields on an owned group and return its count.

        Raises:
            Http404: The group does not belong to the owner.
            ValidationError: Another owned group already has the supplied name.
        """
        group = self._get_group_for_owner(group_id)
        if "name" in group_data and (
            Group.objects.filter(owner=self.owner, name__iexact=group_data["name"])
            .exclude(pk=group.pk)
            .exists()
        ):
            raise ValidationError({"name": self.DUPLICATE_NAME_MESSAGE})

        updated_fields = set(group_data)
        if updated_fields:
            group.name = group_data.get("name", group.name)
            group.color = group_data.get("color", group.color)
            try:
                with transaction.atomic():
                    group.save(update_fields=updated_fields)
            except IntegrityError as error:
                # The constraint also catches concurrent requests after the pre-check.
                if GROUP_NAME_UNIQUE_CONSTRAINT not in str(error):
                    raise
                raise ValidationError({"name": self.DUPLICATE_NAME_MESSAGE}) from error

        return self._get_group_for_owner(group_id)

    def delete_group_for_owner(self, group_id: int) -> None:
        """Delete an owned group and its links while retaining its friends."""
        group = self._get_group_for_owner(group_id)
        group.delete()

    def _get_group_for_owner(self, group_id: int) -> Group:
        """Return an owned group with its friend count or raise 404."""
        return get_object_or_404(self.list_groups_for_owner(), pk=group_id)
