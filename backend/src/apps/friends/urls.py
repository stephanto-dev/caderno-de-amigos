"""Public friend routes."""

from django.urls import path

from apps.friends.views.contact import (
    RecordContactBatchView,
    RecordContactView,
    UndoContactBatchView,
    UndoContactView,
)
from apps.friends.views.friend import (
    FriendBulkImportView,
    FriendDetailView,
    FriendsListView,
)

urlpatterns = [
    path("", FriendsListView.as_view(), name="list_friends"),
    path("bulk-import/", FriendBulkImportView.as_view(), name="import_friends"),
    path(
        "contact-batches/",
        RecordContactBatchView.as_view(),
        name="record_contact_batch",
    ),
    path(
        "contact-batches/<uuid:batch_id>/",
        UndoContactBatchView.as_view(),
        name="undo_contact_batch",
    ),
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
