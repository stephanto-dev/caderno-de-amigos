from django.contrib import admin

from apps.friends.models import Contact, Friend, Group


class TestAdminRegistration:
    def test_all_friend_models_are_registered(self) -> None:
        # Arrange
        friend_models = (Contact, Friend, Group)

        # Act
        is_registered = [admin.site.is_registered(model) for model in friend_models]

        # Assert
        assert all(is_registered)
