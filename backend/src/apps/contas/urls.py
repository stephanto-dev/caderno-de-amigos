"""Public routes for user session endpoints."""

from django.urls import path

from apps.contas.views.login import LoginView
from apps.contas.views.logout import LogoutView
from apps.contas.views.me import MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="get_current_user"),
    path("login/", LoginView.as_view(), name="login_user"),
    path("logout/", LogoutView.as_view(), name="logout_user"),
]
