"""Read and write endpoints for groups."""

from typing import cast
from uuid import UUID

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from apps.friends.serializers.group import GroupReadSerializer, GroupWriteSerializer
from apps.friends.services.groups import GroupCreateData, GroupsService, GroupUpdateData
from apps.friends.views.base import BaseAPIView


class GroupsListView(BaseAPIView):
    """List groups belonging to the authenticated owner."""

    def get(self, request: Request) -> Response:
        """Return owned groups with their number of friends."""
        groups = GroupsService(self.get_owner()).list_groups_for_owner()
        return Response(GroupReadSerializer(groups, many=True).data)

    def post(self, request: Request) -> Response:
        """Validate input and return the newly created group."""
        serializer = GroupWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = GroupsService(self.get_owner()).create_group_for_owner(
            cast(GroupCreateData, serializer.validated_data)
        )
        return Response(GroupReadSerializer(group).data, status=status.HTTP_201_CREATED)


class GroupDetailView(BaseAPIView):
    """Edit or delete one group belonging to the authenticated owner."""

    def patch(self, request: Request, group_id: UUID) -> Response:
        """Validate supplied fields and return the updated group."""
        serializer = GroupWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        group = GroupsService(self.get_owner()).update_group_for_owner(
            group_id, cast(GroupUpdateData, serializer.validated_data)
        )
        return Response(GroupReadSerializer(group).data)

    def delete(self, request: Request, group_id: UUID) -> Response:
        """Delete an owned group without deleting its friends."""
        GroupsService(self.get_owner()).delete_group_for_owner(group_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
