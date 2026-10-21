"""Public URL routes for Django."""

from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

urlpatterns = [
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/friends/", include("apps.friends.urls")),
    path("admin/", admin.site.urls),
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
]
