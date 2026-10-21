"""Public friend routes."""

from django.urls import path

from apps.amigos.views.amigo import AmigoDetailView, AmigosListView

urlpatterns = [
    path("", AmigosListView.as_view(), name="listar_amigos"),
    path("<int:amigo_id>/", AmigoDetailView.as_view(), name="get_amigo"),
]
