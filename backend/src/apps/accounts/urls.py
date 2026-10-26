"""Public routes for user session endpoints."""

from django.urls import path

from apps.accounts.views.login import LoginView
from apps.accounts.views.logout import LogoutView
from apps.accounts.views.me import MeView
from apps.accounts.views.register import RegisterView

urlpatterns = [
    path("me/", MeView.as_view(), name="get_current_user"),
    path("login/", LoginView.as_view(), name="login_user"),
    path("register/", RegisterView.as_view(), name="register_user"),
    path("logout/", LogoutView.as_view(), name="logout_user"),
]
