"""Custom exception handler for DRF to prevent stack trace exposure."""

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that prevents stack trace information
    from being exposed to external users in production.

    In DEBUG mode, returns detailed error information for development.
    In production, returns generic error messages without sensitive details.
    """
    # Call DRF's default exception handler first
    response = drf_exception_handler(exc, context)

    if response is not None:
        return response

    # Handle unhandled exceptions
    view = context.get("view")
    request = context.get("request")

    # Log the full exception for debugging (exc_info=exc to include traceback)
    logger.error(
        "Unhandled exception in %s: %s",
        view.__class__.__name__ if view else "Unknown",
        exc,
        exc_info=exc,
        extra={
            "request_path": request.path if request else None,
            "request_method": request.method if request else None,
        },
    )

    # In DEBUG mode, include exception details for development
    if settings.DEBUG:
        return Response(
            {
                "detail": str(exc),
                "exception_type": exc.__class__.__name__,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # In production, return a generic error message
    return Response(
        {"detail": "An internal server error occurred."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
