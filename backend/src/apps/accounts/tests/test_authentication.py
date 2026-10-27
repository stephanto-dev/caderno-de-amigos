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
        assert response.data == {"authenticated": False, "user": None, "email": None}
        assert "csrftoken" in response.cookies

    def test_login_with_valid_credentials_creates_session(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        get_user_model().objects.create_user(
            username="ana", email="ana@example.com", password="senha-segura"
        )
        csrf_client.get(reverse("get_current_user"))
        csrf_token = csrf_client.cookies["csrftoken"].value

        # Act
        response = csrf_client.post(
            reverse("login_user"),
            {"email": "ANA@example.com", "password": "senha-segura"},
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        me_response = csrf_client.get(reverse("get_current_user"))

        # Assert
        assert response.status_code == 200
        assert response.data == {
            "authenticated": True,
            "user": "ana",
            "email": "ana@example.com",
        }
        assert me_response.data == response.data

    def test_login_with_wrong_password_returns_generic_error(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        get_user_model().objects.create_user(
            username="ana", email="ana@example.com", password="senha-segura"
        )
        csrf_client.get(reverse("get_current_user"))

        # Act
        response = csrf_client.post(
            reverse("login_user"),
            {"email": "ana@example.com", "password": "incorreta"},
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert response.data == {
            "type": "validation_error",
            "errors": [
                {
                    "code": "invalid",
                    "detail": "E-mail ou senha incorretos.",
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
            {"email": "desconhecido@example.com", "password": "senha-segura"},
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert response.data == {
            "type": "validation_error",
            "errors": [
                {
                    "code": "invalid",
                    "detail": "E-mail ou senha incorretos.",
                    "attr": None,
                }
            ],
        }

    def test_login_without_csrf_token_is_forbidden(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        get_user_model().objects.create_user(
            username="ana", email="ana@example.com", password="senha-segura"
        )

        # Act
        response = csrf_client.post(
            reverse("login_user"),
            {"email": "ana@example.com", "password": "senha-segura"},
        )

        # Assert
        assert response.status_code == 403

    def test_logout_invalidates_session(self, csrf_client: APIClient) -> None:
        # Arrange
        get_user_model().objects.create_user(
            username="ana", email="ana@example.com", password="senha-segura"
        )
        csrf_client.get(reverse("get_current_user"))
        csrf_token = csrf_client.cookies["csrftoken"].value
        csrf_client.post(
            reverse("login_user"),
            {"email": "ana@example.com", "password": "senha-segura"},
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
        assert me_response.data == {"authenticated": False, "user": None, "email": None}

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
                {"email": "desconhecido@example.com", "password": "incorreta"},
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


@pytest.mark.django_db
class TestRegistration:
    def test_register_creates_user_and_session(self, csrf_client: APIClient) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))

        # Act
        response = csrf_client.post(
            reverse("register_user"),
            {
                "email": "ANA@Example.com",
                "password": "senha-segura",
                "password_confirm": "senha-segura",
            },
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 201
        assert response.data == {
            "authenticated": True,
            "user": "ana@example.com",
            "email": "ana@example.com",
        }
        assert csrf_client.get(reverse("get_current_user")).data == response.data
        assert (
            get_user_model()
            .objects.get(username="ana@example.com")
            .check_password("senha-segura")
        )

    def test_register_rejects_existing_email_ignoring_case(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        get_user_model().objects.create_user(
            username="legacy", email="ana@example.com", password="senha-segura"
        )
        csrf_client.get(reverse("get_current_user"))

        # Act
        response = csrf_client.post(
            reverse("register_user"),
            {
                "email": "ANA@example.com",
                "password": "senha-segura",
                "password_confirm": "senha-segura",
            },
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"][0]["detail"] == "Este e-mail já tem conta."
        assert response.data["errors"][0]["attr"] == "email"

    def test_register_rejects_different_passwords(self, csrf_client: APIClient) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))

        # Act
        response = csrf_client.post(
            reverse("register_user"),
            {
                "email": "ana@example.com",
                "password": "senha-segura",
                "password_confirm": "outra-senha",
            },
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"][0]["detail"] == "As senhas não são iguais."
        assert response.data["errors"][0]["attr"] == "password_confirm"

    def test_register_rejects_short_password(self, csrf_client: APIClient) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))

        # Act
        response = csrf_client.post(
            reverse("register_user"),
            {
                "email": "ana@example.com",
                "password": "curta",
                "password_confirm": "curta",
            },
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert (
            response.data["errors"][0]["detail"]
            == "A senha precisa ter pelo menos 8 caracteres."
        )
        assert response.data["errors"][0]["attr"] == "password"

    def test_register_rejects_email_too_long_for_username(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))
        email = f"{'a' * 140}@example.com"

        # Act
        response = csrf_client.post(
            reverse("register_user"),
            {
                "email": email,
                "password": "senha-segura",
                "password_confirm": "senha-segura",
            },
            HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value,
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"][0]["detail"] == (
            "O e-mail precisa ter no máximo 150 caracteres."
        )
        assert response.data["errors"][0]["attr"] == "email"

    def test_register_without_csrf_token_is_forbidden(
        self, csrf_client: APIClient
    ) -> None:
        # Act
        response = csrf_client.post(
            reverse("register_user"),
            {
                "email": "ana@example.com",
                "password": "senha-segura",
                "password_confirm": "senha-segura",
            },
        )

        # Assert
        assert response.status_code == 403

    def test_sixth_register_attempt_in_one_minute_is_throttled(
        self, csrf_client: APIClient
    ) -> None:
        # Arrange
        csrf_client.get(reverse("get_current_user"))
        csrf_token = csrf_client.cookies["csrftoken"].value

        # Act
        responses = [
            csrf_client.post(
                reverse("register_user"),
                {
                    "email": "ana@example.com",
                    "password": "curta",
                    "password_confirm": "curta",
                },
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
