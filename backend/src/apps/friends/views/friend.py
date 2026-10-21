"""Read endpoints for friends."""

from rest_framework.request import Request
from rest_framework.response import Response

from apps.friends.serializers.friend import BoardFriendSerializer
from apps.friends.services.friends import FriendsService
from apps.friends.views.base import BaseAPIView


class FriendsListView(BaseAPIView):
    """Return the authenticated owner's board-ready friend list."""

    def get(self, request: Request) -> Response:
        """Return friends in board and urgency order."""
        friends = FriendsService(
            self.get_queryset(), self.get_owner()
        ).list_friends()
        return Response(BoardFriendSerializer(friends, many=True).data)


class FriendDetailView(BaseAPIView):
    """Return one friend when it belongs to the authenticated owner."""

    def get(self, request: Request, friend_id: int) -> Response:
        """Return board-ready details for one friend."""
        friend = FriendsService(
            self.get_queryset(), self.get_owner()
        ).get_friend_for_owner(friend_id)
        return Response(BoardFriendSerializer(friend).data)
