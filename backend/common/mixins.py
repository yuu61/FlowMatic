"""
Common mixins for views across the backend application.
"""

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from common.constants import ERROR_NOT_ASSIGNED_TO_PROJECT
from projects.models import Project


class ProjectMembershipMixin:
    """
    Mixin that provides project membership validation.
    Use this mixin in views that need to check if the current user
    is a member of a project.
    """

    def _get_project(self, project_id):
        """
        Get a project by ID and verify that the current user is a member.

        Args:
            project_id: The UUID of the project

        Returns:
            Project instance if user is a member

        Raises:
            Http404: If project doesn't exist
            PermissionDenied: If user is not a member
        """
        project = get_object_or_404(
            Project.objects.prefetch_related("members"), project_id=project_id
        )
        if not project.members.filter(pk=self.request.user.pk).exists():
            raise PermissionDenied(ERROR_NOT_ASSIGNED_TO_PROJECT)
        return project
