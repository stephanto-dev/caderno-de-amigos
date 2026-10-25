"""Public friend routes."""

from django.urls import path

from apps.friends.views.contact import RecordContactView, UndoContactView
from apps.friends.views.friend import FriendDetailView, FriendsListView

urlpatterns = [
    path("", FriendsListView.as_view(), name="list_friends"),
    path("<uuid:friend_id>/", FriendDetailView.as_view(), name="get_friend"),
    path(
        "<uuid:friend_id>/contacts/", RecordContactView.as_view(), name="record_contact"
    ),
    path(
        "<uuid:friend_id>/contacts/<uuid:contact_id>/",
        UndoContactView.as_view(),
        name="undo_contact",
    ),
]
