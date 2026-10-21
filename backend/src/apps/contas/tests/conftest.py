import pytest
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def clear_login_throttle_cache() -> None:
    """Keep login attempts from one test out of the next test."""
    cache.clear()


@pytest.fixture
def csrf_client() -> APIClient:
    """Use a test client that checks CSRF like a browser request."""
    return APIClient(enforce_csrf_checks=True)
