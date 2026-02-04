from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from api.auth_views import (
    AuthStatusView,
    CookieLoginView,
    CookieLogoutView,
    CookieRefreshView,
    CSRFTokenView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # App-level routes
    path("api/", include("api.urls")),
    path("api/", include("event.urls")),
    path("api/", include("files.urls")),
    # Cookie-based JWT authentication
    path("api/auth/login/", CookieLoginView.as_view(), name="auth-login"),
    path("api/auth/refresh/", CookieRefreshView.as_view(), name="auth-refresh"),
    path("api/auth/logout/", CookieLogoutView.as_view(), name="auth-logout"),
    path("api/auth/status/", AuthStatusView.as_view(), name="auth-status"),
    path("api/auth/csrf/", CSRFTokenView.as_view(), name="auth-csrf"),
    path("api-auth/", include("rest_framework.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
