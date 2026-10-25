"""Read and write endpoints for friends."""

from typing import cast
from uuid import UUID

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from apps.friends.serializers.friend import BoardFriendSerializer, FriendWriteSerializer
from apps.friends.services.friends import FriendsService, FriendWriteData
from apps.friends.views.base import BaseAPIView


class FriendsListView(BaseAPIView):
    """List and create friends for the authenticated owner."""

    def get(self, request: Request) -> Response:
        """Return friends in board and urgency order."""
        friends = FriendsService(self.get_queryset(), self.get_owner()).list_friends()
        return Response(BoardFriendSerializer(friends, many=True).data)

    def post(self, request: Request) -> Response:
        """Validate and create a friend, then return its board representation."""
        serializer = FriendWriteSerializer(
            data=request.data, context={"owner": self.get_owner()}
        )
        serializer.is_valid(raise_exception=True)
        friends_service = FriendsService(self.get_queryset(), self.get_owner())
        friend = friends_service.create_friend_for_owner(
            cast(FriendWriteData, serializer.validated_data)
        )
        return Response(
            BoardFriendSerializer(friend).data, status=status.HTTP_201_CREATED
        )


class FriendDetailView(BaseAPIView):
    """Read, edit, and delete one friend belonging to the authenticated owner."""

    def get(self, request: Request, friend_id: UUID) -> Response:
        """Return board-ready details for one friend."""
        friend = FriendsService(
            self.get_queryset(), self.get_owner()
        ).get_friend_for_owner(friend_id)
        return Response(BoardFriendSerializer(friend).data)

    def patch(self, request: Request, friend_id: UUID) -> Response:
        """Validate supplied fields and return the updated board representation."""
        serializer = FriendWriteSerializer(
            data=request.data, partial=True, context={"owner": self.get_owner()}
        )
        serializer.is_valid(raise_exception=True)
        friends_service = FriendsService(self.get_queryset(), self.get_owner())
        friend = friends_service.update_friend_for_owner(
            friend_id, cast(FriendWriteData, serializer.validated_data)
        )
        return Response(BoardFriendSerializer(friend).data)

    def delete(self, request: Request, friend_id: UUID) -> Response:
        """Delete an owned friend and return an empty successful response."""
        FriendsService(self.get_queryset(), self.get_owner()).delete_friend_for_owner(
            friend_id
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
