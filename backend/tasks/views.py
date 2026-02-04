from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import ERROR_NOT_ASSIGNED_TO_PROJECT
from common.mixins import ProjectMembershipMixin

from .models import Task
from .serializers import (
    TaskCommentCreateSerializer,
    TaskCommentListSerializer,
    TaskCommentResponseSerializer,
    TaskCreateSerializer,
    TaskResponseSerializer,
    TaskUpdateSerializer,
)


class TaskListCreateView(ProjectMembershipMixin, APIView):
    """GET/POST /api/projects/{project_id}/tasks - List and create tasks for the project.

    Permissions: authenticated user assigned to the project.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project = self._get_project(project_id)
        tasks = (
            Task.objects
            .filter(project=project)
            .select_related("project")
            .prefetch_related(
                "assigned_users", "parents__parent_task", "comments__user"
            )
            .order_by("deadline")
        )
        serializer = TaskResponseSerializer(tasks, many=True)
        return Response({"tasks": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = self._get_project(project_id)
        serializer = TaskCreateSerializer(
            data=request.data, context={"project": project, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        response_serializer = TaskResponseSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class TaskCommentCreateView(ProjectMembershipMixin, APIView):
    """POST /api/projects/{project_id}/tasks/{task_id}/comments - Create a comment for a task.

    Permissions: authenticated user assigned to the project.
    """

    permission_classes = [IsAuthenticated]

    def _get_task(self, project, task_id):
        task = get_object_or_404(Task, task_id=task_id, project=project)
        return task

    def post(self, request, project_id, task_id):
        project = self._get_project(project_id)
        task = self._get_task(project, task_id)
        serializer = TaskCommentCreateSerializer(
            data=request.data, context={"task": task, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()

        response_serializer = TaskCommentResponseSerializer(comment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class TaskCommentListView(APIView):
    """GET /api/tasks/{task_id}/comments - List comments for a task.

    Permissions: authenticated user assigned to the task's project.
    """

    permission_classes = [IsAuthenticated]

    def _get_task(self, task_id):
        task = get_object_or_404(
            Task.objects.select_related("project").prefetch_related("project__members"),
            task_id=task_id,
        )
        if not task.project.members.filter(pk=self.request.user.pk).exists():
            raise PermissionDenied(ERROR_NOT_ASSIGNED_TO_PROJECT)
        return task

    def get(self, request, task_id):
        task = self._get_task(task_id)
        comments = task.comments.select_related("user").all()
        serializer = TaskCommentListSerializer(comments, many=True)
        return Response({"comments": serializer.data}, status=status.HTTP_200_OK)


class TaskDetailView(ProjectMembershipMixin, APIView):
    """GET/PUT/PATCH /api/projects/{project_id}/tasks/{task_id} - Get, update, and delete a task.

    Permissions: authenticated user assigned to the project.
    """

    permission_classes = [IsAuthenticated]

    def _get_task(self, project, task_id, prefetch_for_response=False):
        """Get a task by ID within a project.

        Args:
            project: The project the task belongs to.
            task_id: The task's UUID.
            prefetch_for_response: If True, prefetch related data for serialization
                                   to avoid N+1 queries.
        """
        queryset = Task.objects.filter(project=project)
        if prefetch_for_response:
            queryset = queryset.prefetch_related(
                "assigned_users", "parents__parent_task", "comments__user"
            )
        task = get_object_or_404(queryset, task_id=task_id)
        return task

    def get(self, request, project_id, task_id):
        project = self._get_project(project_id)
        task = self._get_task(project, task_id, prefetch_for_response=True)
        serializer = TaskResponseSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, project_id, task_id):
        project = self._get_project(project_id)
        task = self._get_task(project, task_id)

        serializer = TaskUpdateSerializer(
            instance=task,
            data=request.data,
            context={"project": project, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        task.refresh_from_db()
        response_serializer = TaskResponseSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, project_id, task_id):
        project = self._get_project(project_id)
        task = self._get_task(project, task_id)

        serializer = TaskUpdateSerializer(
            instance=task,
            data=request.data,
            context={"project": project, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        task.refresh_from_db()
        response_serializer = TaskResponseSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
