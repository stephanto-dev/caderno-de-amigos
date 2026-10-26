"""Routes that serve the Vue application on direct browser visits."""

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
