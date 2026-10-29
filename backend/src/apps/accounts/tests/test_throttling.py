"""Account request limits must survive forged headers and session changes."""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

ATTEMPTS_OVER_LIMIT = 6
CLIENT_IP = "192.0.2.10"
OTHER_CLIENT_IP = "192.0.2.20"
PROXY_IP = "192.0.2.30"


@pytest.mark.django_db
class TestAccountRateLimits:
    def test_login_ignores_forged_forwarded_ips_without_trusted_proxies(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))

        # Act
        responses = [
            csrf_client.post(
                reverse("login_user"),
                {"email": "unknown@example.com", "password": "incorrect-password"},
                HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
                REMOTE_ADDR=CLIENT_IP,
                HTTP_X_FORWARDED_FOR=f"198.51.100.{attempt}",
            )
            for attempt in range(ATTEMPTS_OVER_LIMIT)
        ]

        # Assert
        assert [response.status_code for response in responses] == [
            400,
            400,
            400,
            400,
            400,
            429,
        ]

    def test_successful_registrations_share_ip_limit_after_session_changes(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))

        # Act
        responses = [
            csrf_client.post(
                reverse("register_user"),
                {
                    "email": f"account-{attempt}@example.com",
                    "password": "senha-segura",
                    "password_confirm": "senha-segura",
                },
                HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
                REMOTE_ADDR=CLIENT_IP,
            )
            for attempt in range(ATTEMPTS_OVER_LIMIT)
        ]

        # Assert
        assert [response.status_code for response in responses] == [
            201,
            201,
            201,
            201,
            201,
            429,
        ]
        assert get_user_model().objects.count() == ATTEMPTS_OVER_LIMIT - 1

    @override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "NUM_PROXIES": 1})
    def test_login_uses_ip_appended_by_trusted_proxy_despite_forged_prefix(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))

        # Act
        responses = [
            csrf_client.post(
                reverse("login_user"),
                {"email": "unknown@example.com", "password": "incorrect-password"},
                HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
                REMOTE_ADDR=PROXY_IP,
                HTTP_X_FORWARDED_FOR=f"198.51.100.{attempt}, {CLIENT_IP}",
            )
            for attempt in range(ATTEMPTS_OVER_LIMIT)
        ]

        # Assert
        assert [response.status_code for response in responses] == [
            400,
            400,
            400,
            400,
            400,
            429,
        ]

    @override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "NUM_PROXIES": 1})
    def test_login_keeps_limits_separate_for_clients_behind_trusted_proxy(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))
        for _ in range(ATTEMPTS_OVER_LIMIT):
            csrf_client.post(
                reverse("login_user"),
                {"email": "unknown@example.com", "password": "incorrect-password"},
                HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
                REMOTE_ADDR=PROXY_IP,
                HTTP_X_FORWARDED_FOR=CLIENT_IP,
            )

        # Act
        response = csrf_client.post(
            reverse("login_user"),
            {"email": "unknown@example.com", "password": "incorrect-password"},
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
            REMOTE_ADDR=PROXY_IP,
            HTTP_X_FORWARDED_FOR=OTHER_CLIENT_IP,
        )

        # Assert
        assert response.status_code == 400
