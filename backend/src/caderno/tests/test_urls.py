"""Routes that serve the Vue application on direct browser visits."""

from django.test import Client
from django.urls import resolve


class TestSpaRoutes:
    def test_frontend_urls_render_the_same_index_template(self) -> None:
        # Arrange
        index_view = resolve("/").func
        urls = (
            "/amigos",
            "/amigos/novo",
            "/amigos/123",
            "/config",
            "/entrar",
            "/quadro",
        )

        # Act and assert
        for url in urls:
            assert resolve(url).func is index_view

    def test_old_login_url_redirects_to_enter(self) -> None:
        # Act
        response = Client().get("/login")

        # Assert
        assert response.status_code == 302
        assert response["Location"] == "/entrar"
