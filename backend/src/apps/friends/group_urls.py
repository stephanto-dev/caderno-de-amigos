"""Public group routes."""

from django.urls import path

from apps.friends.views.group import GroupDetailView, GroupsListView

urlpatterns = [
    path("", GroupsListView.as_view(), name="list_groups"),
    path("<int:group_id>/", GroupDetailView.as_view(), name="group_detail"),
]
