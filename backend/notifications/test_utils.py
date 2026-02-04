"""
Shared test utilities for notification integration tests.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework_simplejwt.tokens import AccessToken

from projects.models import Project

User = get_user_model()


def get_auth_headers(user):
    """
    Generate authentication headers using JWT token for a user.

    Args:
        user: User instance to generate token for

    Returns:
        dict: HTTP headers with Bearer token
    """
    token = AccessToken.for_user(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


def create_test_users(count=3, prefix="user"):
    """
    Create test users with sequential names.

    Args:
        count: Number of users to create
        prefix: Prefix for username

    Returns:
        list: List of created User instances
    """
    users = []
    for i in range(1, count + 1):
        user = User.objects.create_user(
            username=f"{prefix}{i}",
            email=f"{prefix}{i}@example.com",
            password="testpass123",
        )
        users.append(user)
    return users


def create_test_project(
    title="テストプロジェクト", members=None, days_until_deadline=30
):
    """
    Create a test project with optional members.

    Args:
        title: Project title
        members: List of User instances to add as members
        days_until_deadline: Number of days from now until deadline

    Returns:
        Project: Created project instance
    """
    project = Project.objects.create(
        title=title,
        start_date=timezone.now(),
        deadline=timezone.now() + timedelta(days=days_until_deadline),
    )
    if members:
        project.members.add(*members)
    return project


class NotificationTestMixin:
    """
    Mixin providing common setup for notification integration tests.

    Usage:
        class MyTestCase(NotificationTestMixin, TestCase):
            def setUp(self):
                super().setUp()
                # Additional setup...
    """

    def setUp(self):
        """Set up common test fixtures."""
        super().setUp()
        self.users = create_test_users(3)
        self.user1 = self.users[0]
        self.user2 = self.users[1]
        self.user3 = self.users[2]

    def get_auth_headers(self, user=None):
        """Get auth headers for specified user or user1."""
        return get_auth_headers(user or self.user1)
