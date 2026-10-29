"""Request limits for account endpoints, independent of browser sessions."""

from rest_framework.request import Request
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView


class AccountIPRateThrottle(ScopedRateThrottle):
    """Keep each account endpoint's rate limit tied to the trusted client IP.

    DRF chooses the IP using NUM_PROXIES. Login and registration change the
    session, so using the authenticated user's ID would reset their counter.
    """

    def get_cache_key(self, request: Request, view: APIView) -> str:
        """Return the endpoint's IP counter key, including for signed-in users."""
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
