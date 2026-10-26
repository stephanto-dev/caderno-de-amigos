"""Public URL routes for Django."""

from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

frontend_view = TemplateView.as_view(template_name="index.html")

urlpatterns = [
    path("api/", include("apps.accounts.urls")),
    path("api/friends/", include("apps.friends.urls")),
    path("api/groups/", include("apps.friends.group_urls")),
    path("admin/", admin.site.urls),
    # Browser refresh reaches Django before Vue Router can select the page.
    path("amigos", frontend_view),
    path("amigos/novo", frontend_view),
    path("amigos/<str:friend_id>", frontend_view),
    path("login", frontend_view),
    path("", frontend_view, name="home"),
]
