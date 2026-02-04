from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken


class JWTAuthMiddleware:
    """WebSocket JWT authentication middleware.

    Extracts JWT token from multiple sources in order of priority:
    1. Cookie (preferred - most secure, automatic)
    2. Sec-WebSocket-Protocol header (for clients that can't use cookies)
    3. Query string (deprecated, for backward compatibility)

    Security Note:
    - Cookies are automatically sent with WebSocket handshake
    - Sec-WebSocket-Protocol header is preferred over query string
    - Query string tokens are visible in server logs and browser history
    """

    # Subprotocol prefix for token authentication
    TOKEN_PROTOCOL_PREFIX = "access_token"

    def __init__(self, app):
        self.app = app
        self.jwt_auth = JWTAuthentication()

    def _extract_token_from_cookies(self, scope):
        """Extract JWT token from cookies.

        Cookies are automatically included in WebSocket handshake headers.
        """
        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode()

        if not cookie_header:
            return None

        cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "access_token")

        for cookie in cookie_header.split(";"):
            cookie = cookie.strip()
            if cookie.startswith(f"{cookie_name}="):
                return cookie.split("=", 1)[1]

        return None

    def _extract_token_from_subprotocols(self, scope):
        """Extract JWT token from Sec-WebSocket-Protocol header.

        Expected format: ["access_token", "<jwt_token>"]
        The browser sends: Sec-WebSocket-Protocol: access_token, <jwt_token>
        """
        subprotocols = scope.get("subprotocols", [])
        if len(subprotocols) >= 2 and subprotocols[0] == self.TOKEN_PROTOCOL_PREFIX:
            return subprotocols[1]
        return None

    def _extract_token_from_query_string(self, scope):
        """Extract JWT token from query string (deprecated, backward compat)."""
        query_string = scope.get("query_string", b"").decode()
        for param in query_string.split("&"):
            if param.startswith("token="):
                return param.split("=", 1)[1]
        return None

    async def __call__(self, scope, receive, send):
        token = None
        use_subprotocol_response = False

        # Priority 1: Cookie (preferred - most secure)
        token = self._extract_token_from_cookies(scope)

        # Priority 2: Subprotocol header
        if not token:
            token = self._extract_token_from_subprotocols(scope)
            if token:
                use_subprotocol_response = True

        # Priority 3: Query string (deprecated)
        if not token:
            token = self._extract_token_from_query_string(scope)

        if token:
            from asgiref.sync import sync_to_async

            @sync_to_async
            def get_user():
                try:
                    validated_token = self.jwt_auth.get_validated_token(token)
                    return self.jwt_auth.get_user(validated_token)
                except (InvalidToken, AuthenticationFailed):
                    return AnonymousUser()

            scope["user"] = await get_user()

            # If using subprotocol auth, we need to accept the protocol
            if use_subprotocol_response:
                scope["accepted_subprotocol"] = self.TOKEN_PROTOCOL_PREFIX
        else:
            scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)
