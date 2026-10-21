"""Public friend routes."""

from django.urls import path

from apps.friends.views.friend import FriendDetailView, FriendsListView

urlpatterns = [
    path("", FriendsListView.as_view(), name="list_friends"),
    path("<int:friend_id>/", FriendDetailView.as_view(), name="get_friend"),
]
