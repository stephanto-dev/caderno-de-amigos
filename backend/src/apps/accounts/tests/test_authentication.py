import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestSessionAuthentication:
    def test_me_when_anonymous_returns_csrf_cookie(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        url = reverse("get_current_user")

        # Act
        response = csrf_client.get(url)

        # Assert
        assert response.status_code == 200
        assert response.data == {"authenticated": False, "user": None}
        assert "csrftoken" in response.cookies

    def test_login_with_valid_credentials_creates_session(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        get_user_model().objects.create_user(username="ana", password="senha-segura")
        csrf_client.get(reverse("get_current_user"))
        csrf_token = csrf_client.cookies["csrftoken"].value

        # Act
        response = csrf_client.post(
            reverse("login_user"),
            {"username": "ana", "password": "senha-segura"},
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        me_response = csrf_client.get(reverse("get_current_user"))

        # Assert
        assert response.status_code == 200
        assert response.data == {"authenticated": True, "user": "ana"}
        assert me_response.data == response.data

    def test_login_with_wrong_password_returns_generic_error(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        get_user_model().objects.create_user(username="ana", password="senha-segura")
        csrf_client.get(reverse("get_current_user"))

        # Act
        response = csrf_client.post(
            reverse("login_user"),
            {"username": "ana", "password": "incorreta"},
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert response.data == {
            "type": "validation_error",
            "errors": [
                {
                    "code": "invalid",
                    "detail": "Usuário ou senha inválidos.",
                    "attr": None,
                }
            ],
        }

    def test_login_with_unknown_user_returns_same_error(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))

        # Act
        response = csrf_client.post(
            reverse("login_user"),
            {"username": "desconhecido", "password": "senha-segura"},
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert response.data == {
            "type": "validation_error",
            "errors": [
                {
                    "code": "invalid",
                    "detail": "Usuário ou senha inválidos.",
                    "attr": None,
                }
            ],
        }

    def test_login_without_csrf_token_is_forbidden(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        get_user_model().objects.create_user(username="ana", password="senha-segura")

        # Act
        response = csrf_client.post(
            reverse("login_user"), {"username": "ana", "password": "senha-segura"}
        )

        # Assert
        assert response.status_code == 403

    def test_logout_invalidates_session(self, csrf_client: APIClient) -> None:
        # Arrange
        get_user_model().objects.create_user(username="ana", password="senha-segura")
        csrf_client.get(reverse("get_current_user"))
        csrf_token = csrf_client.cookies["csrftoken"].value
        csrf_client.post(
            reverse("login_user"),
            {"username": "ana", "password": "senha-segura"},
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        # Act
        response = csrf_client.post(
            reverse("logout_user"),
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )
        me_response = csrf_client.get(reverse("get_current_user"))

        # Assert
        assert response.status_code == 204
        assert me_response.data == {"authenticated": False, "user": None}

    def test_logout_when_anonymous_is_forbidden(self, csrf_client: APIClient) -> None:
        # Arrange
        url = reverse("logout_user")

        # Act
        response = csrf_client.post(url)

        # Assert
        assert response.status_code == 403

    def test_sixth_login_attempt_in_one_minute_is_throttled(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))
        csrf_token = csrf_client.cookies["csrftoken"].value

        # Act
        responses = [
            csrf_client.post(
                reverse("login_user"),
                {"username": "desconhecido", "password": "incorreta"},
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            for _ in range(6)
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
