"""Cookie-based authentication views."""

from django.conf import settings
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import EmailLoginSerializer, UserSerializer


def _get_cookie_settings() -> dict:
    """Get cookie settings from Django settings."""
    return {
        "httponly": getattr(settings, "JWT_AUTH_COOKIE_HTTP_ONLY", True),
        "secure": getattr(settings, "JWT_AUTH_COOKIE_SECURE", not settings.DEBUG),
        "samesite": getattr(settings, "JWT_AUTH_COOKIE_SAMESITE", "Lax"),
        "path": getattr(settings, "JWT_AUTH_COOKIE_PATH", "/"),
    }


def _set_auth_cookies(response: Response, refresh: RefreshToken) -> None:
    """Set authentication cookies on the response.

    Args:
        response: The response object to set cookies on
        refresh: The refresh token containing access token
    """
    cookie_settings = _get_cookie_settings()
    access_cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "access_token")
    refresh_cookie_name = getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token")
    access_max_age = getattr(settings, "JWT_AUTH_COOKIE_MAX_AGE", 30 * 60)
    refresh_max_age = getattr(settings, "JWT_AUTH_REFRESH_COOKIE_MAX_AGE", 24 * 60 * 60)

    # Set access token cookie
    response.set_cookie(
        key=access_cookie_name,
        value=str(refresh.access_token),
        max_age=access_max_age,
        **cookie_settings,
    )

    # Set refresh token cookie
    response.set_cookie(
        key=refresh_cookie_name,
        value=str(refresh),
        max_age=refresh_max_age,
        **cookie_settings,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Clear authentication cookies from the response.

    Args:
        response: The response object to clear cookies from
    """
    cookie_settings = _get_cookie_settings()
    access_cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "access_token")
    refresh_cookie_name = getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token")

    response.delete_cookie(
        key=access_cookie_name,
        path=cookie_settings["path"],
        samesite=cookie_settings["samesite"],
    )
    response.delete_cookie(
        key=refresh_cookie_name,
        path=cookie_settings["path"],
        samesite=cookie_settings["samesite"],
    )


class CookieLoginView(APIView):
    """Login endpoint that sets JWT tokens as httpOnly cookies.

    POST /api/auth/login/
    Body: {"email": "...", "password": "..."}

    Response: User data with cookies set
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = EmailLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user, context={"request": request}).data

        response = Response(
            {"user": user_data, "detail": "Login successful"},
            status=status.HTTP_200_OK,
        )

        _set_auth_cookies(response, refresh)

        return response


class CookieRefreshView(APIView):
    """Refresh access token using refresh token from cookie.

    POST /api/auth/refresh/

    Response: New tokens set as cookies
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        refresh_cookie_name = getattr(
            settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"
        )
        refresh_token = request.COOKIES.get(refresh_cookie_name)

        if not refresh_token:
            return Response(
                {"detail": "Refresh token not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)
            # Rotate refresh token for security
            refresh.set_jti()
            refresh.set_exp()
        except (InvalidToken, TokenError) as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(
            {"detail": "Token refreshed successfully"},
            status=status.HTTP_200_OK,
        )

        _set_auth_cookies(response, refresh)

        return response


class CookieLogoutView(APIView):
    """Logout endpoint that clears authentication cookies.

    POST /api/auth/logout/

    Response: Cookies cleared
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        # Blacklist refresh token if possible
        refresh_cookie_name = getattr(
            settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"
        )
        refresh_token = request.COOKIES.get(refresh_cookie_name)

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (InvalidToken, TokenError, AttributeError):
                # Token might be invalid or blacklisting not enabled
                pass

        response = Response(
            {"detail": "Logout successful"},
            status=status.HTTP_200_OK,
        )

        _clear_auth_cookies(response)

        return response


class AuthStatusView(APIView):
    """Check authentication status.

    GET /api/auth/status/

    Response:
    - 200 with user data if authenticated
    - 401 if not authenticated
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user_data = UserSerializer(request.user, context={"request": request}).data
        return Response(
            {"authenticated": True, "user": user_data},
            status=status.HTTP_200_OK,
        )


from django.utils.decorators import method_decorator


@method_decorator(ensure_csrf_cookie, name="get")
class CSRFTokenView(APIView):
    """Get CSRF token for subsequent requests.

    GET /api/auth/csrf/

    Response: CSRF token
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        csrf_token = get_token(request)
        response = Response(
            {"csrfToken": csrf_token},
            status=status.HTTP_200_OK,
        )
        return response
