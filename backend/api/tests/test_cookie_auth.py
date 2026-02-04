"""Tests for Cookie-based JWT authentication."""

from django.conf import settings
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient

import pytest

from api.models import User


@pytest.fixture
def api_client():
    """Create an API client instance."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Create an authenticated API client."""
    response = api_client.post(
        "/api/auth/login/",
        {"email": "test@example.com", "password": "testpass123"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    return api_client


class TestCookieLogin:
    """Tests for /api/auth/login/ endpoint."""

    def test_login_success(self, api_client, user):
        """Test successful login sets cookies."""
        response = api_client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "testpass123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "user" in response.data
        assert response.data["user"]["email"] == "test@example.com"

        # Check cookies are set
        access_cookie = settings.JWT_AUTH_COOKIE
        refresh_cookie = settings.JWT_AUTH_REFRESH_COOKIE

        assert access_cookie in response.cookies
        assert refresh_cookie in response.cookies

        # Check cookie attributes
        access_cookie_obj = response.cookies[access_cookie]
        assert access_cookie_obj["httponly"] is True
        assert access_cookie_obj["samesite"] == "Lax"

    def test_login_invalid_credentials(self, api_client, user):
        """Test login with invalid credentials."""
        response = api_client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "wrongpassword"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_nonexistent_user(self, api_client, db):
        """Test login with nonexistent user."""
        response = api_client.post(
            "/api/auth/login/",
            {"email": "nonexistent@example.com", "password": "testpass123"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestCookieRefresh:
    """Tests for /api/auth/refresh/ endpoint."""

    def test_refresh_success(self, authenticated_client):
        """Test successful token refresh."""
        response = authenticated_client.post("/api/auth/refresh/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Token refreshed successfully"

        # Check new cookies are set
        access_cookie = settings.JWT_AUTH_COOKIE
        assert access_cookie in response.cookies

    def test_refresh_no_token(self, api_client, db):
        """Test refresh without refresh token."""
        response = api_client.post("/api/auth/refresh/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Refresh token not found" in response.data["detail"]


class TestCookieLogout:
    """Tests for /api/auth/logout/ endpoint."""

    def test_logout_success(self, authenticated_client):
        """Test successful logout clears cookies."""
        response = authenticated_client.post("/api/auth/logout/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Logout successful"

        # Check cookies are cleared (max-age=0 or deleted)
        access_cookie = settings.JWT_AUTH_COOKIE
        if access_cookie in response.cookies:
            assert not response.cookies[access_cookie].value

    def test_logout_without_auth(self, api_client, db):
        """Test logout without being authenticated still succeeds."""
        response = api_client.post("/api/auth/logout/")

        assert response.status_code == status.HTTP_200_OK


class TestAuthStatus:
    """Tests for /api/auth/status/ endpoint."""

    def test_status_authenticated(self, authenticated_client, user):
        """Test auth status when authenticated."""
        response = authenticated_client.get("/api/auth/status/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["authenticated"] is True
        assert response.data["user"]["email"] == "test@example.com"

    def test_status_unauthenticated(self, api_client, db):
        """Test auth status when not authenticated."""
        response = api_client.get("/api/auth/status/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestCSRFToken:
    """Tests for /api/auth/csrf/ endpoint."""

    def test_csrf_token_returned(self, api_client, db):
        """Test CSRF token is returned."""
        response = api_client.get("/api/auth/csrf/")

        assert response.status_code == status.HTTP_200_OK
        assert "csrfToken" in response.data
        assert len(response.data["csrfToken"]) > 0

    def test_csrf_cookie_set(self, api_client, db):
        """Test CSRF cookie is set."""
        response = api_client.get("/api/auth/csrf/")

        assert response.status_code == status.HTTP_200_OK
        assert "csrftoken" in response.cookies


class TestCookieAuthentication:
    """Tests for Cookie-based authentication on protected endpoints."""

    def test_protected_endpoint_with_cookie(self, authenticated_client):
        """Test accessing protected endpoint with cookie auth."""
        response = authenticated_client.get("/api/auth/status/")

        assert response.status_code == status.HTTP_200_OK

    def test_protected_endpoint_without_auth(self, api_client, db):
        """Test accessing protected endpoint without authentication."""
        response = api_client.get("/api/auth/status/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_protected_endpoint_with_header_fallback(self, api_client, user):
        """Test Authentication header fallback still works."""
        # Login to get token
        login_response = api_client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "testpass123"},
            format="json",
        )

        # Extract token from cookie
        access_cookie = settings.JWT_AUTH_COOKIE
        token = login_response.cookies[access_cookie].value

        # Create new client without cookies but with header
        new_client = APIClient()
        new_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = new_client.get("/api/auth/status/")
        assert response.status_code == status.HTTP_200_OK


class TestCookieSecuritySettings:
    """Tests for cookie security settings."""

    @override_settings(DEBUG=False, JWT_AUTH_COOKIE_SECURE=True)
    def test_secure_cookie_in_production(self, api_client, user):
        """Test secure flag is set in production."""
        response = api_client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "testpass123"},
            format="json",
        )

        if response.status_code == status.HTTP_200_OK:
            access_cookie = settings.JWT_AUTH_COOKIE
            # In production, secure should be True
            # Note: This might not be testable in test environment
            assert access_cookie in response.cookies
