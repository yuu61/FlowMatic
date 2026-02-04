"""Cookie-based JWT authentication for REST API."""

from django.conf import settings
from rest_framework.request import Request

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    """JWT authentication that reads tokens from httpOnly cookies.

    This authentication class provides enhanced security by:
    1. Reading JWT tokens from httpOnly cookies (not accessible via JavaScript)
    2. Falling back to Authorization header for backward compatibility
    3. Protecting against XSS attacks by keeping tokens out of JavaScript reach

    Cookie names are configured in settings:
    - JWT_AUTH_COOKIE: Access token cookie name (default: "access_token")
    """

    def authenticate(self, request: Request):
        """Authenticate the request using cookie or Authorization header.

        Priority:
        1. Cookie (preferred - more secure)
        2. Authorization header (fallback for API clients)

        Returns:
            tuple: (user, validated_token) if authentication succeeds
            None: if no authentication credentials provided
        """
        # Try cookie first (preferred method)
        raw_token = self._get_token_from_cookie(request)

        # Fall back to Authorization header
        if raw_token is None:
            header = self.get_header(request)
            if header is not None:
                raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken:
            return None

        return self.get_user(validated_token), validated_token

    def _get_token_from_cookie(self, request: Request) -> bytes | None:
        """Extract JWT token from cookie.

        Args:
            request: The incoming request

        Returns:
            bytes: The raw token if found, None otherwise
        """
        cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "access_token")
        token = request.COOKIES.get(cookie_name)

        if token:
            return token.encode("utf-8")
        return None
