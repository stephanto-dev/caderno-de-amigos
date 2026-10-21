from django.contrib import admin

from apps.amigos.models import Amigo, Contato, Grupo


class TestAdminRegistration:
    def test_all_friend_models_are_registered(self) -> None:
        # Arrange
        friend_models = (Amigo, Contato, Grupo)

        # Act
        is_registered = [admin.site.is_registered(model) for model in friend_models]

        # Assert
        assert all(is_registered)
