import pytest
from django.db import connection


@pytest.mark.django_db
class TestDatabase:
    def test_database_uses_postgres(self) -> None:
        # Arrange
        expected_vendor = "postgresql"

        # Act
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()

        # Assert
        assert connection.vendor == expected_vendor
        assert result == (1,)
