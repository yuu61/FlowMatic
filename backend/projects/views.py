from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import (
    DEFAULT_PAGE_SIZE,
    ERROR_NOT_ASSIGNED_TO_PROJECT,
    ERROR_PAGINATION_INTEGERS,
    ERROR_PAGINATION_POSITIVE,
)

from .models import Project
from .serializers import (
    ProjectCreateSerializer,
    ProjectListSerializer,
    ProjectResponseSerializer,
)

User = get_user_model()


class ProjectListCreateView(APIView):
    """GET /api/projects/ - プロジェクト一覧を取得
    POST /api/projects/ - 新しいプロジェクトを作成する
    """

    permission_classes = [IsAuthenticated]

    def _get_queryset_for_user(self):
        user = self.request.user
        if user.is_staff:
            return (
                Project.objects.prefetch_related("tasks").all().order_by("-start_date")
            )
        return (
            Project.objects
            .prefetch_related("tasks")
            .filter(members=user)
            .order_by("-start_date")
        )

    def get(self, request, *args, **kwargs):
        try:
            page = int(
                request.query_params.get("p", request.query_params.get("page", "1"))
            )
            per_page = int(request.query_params.get("per_page", str(DEFAULT_PAGE_SIZE)))
        except ValueError:
            return Response(
                {"detail": ERROR_PAGINATION_INTEGERS},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if page < 1 or per_page < 1:
            return Response(
                {"detail": ERROR_PAGINATION_POSITIVE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self._get_queryset_for_user()
        start = (page - 1) * per_page
        end = start + per_page
        projects = list(queryset[start:end])

        serializer = ProjectListSerializer(projects, many=True)
        return Response({
            "projects": serializer.data,
            "page": page,
            "per_page": per_page,
        })

    def post(self, request, *args, **kwargs):
        serializer = ProjectCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        project = serializer.save()

        response_serializer = ProjectResponseSerializer(project)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    """GET /api/projects/{project_id} - プロジェクト取得
    PUT/PATCH /api/projects/{project_id} - プロジェクト更新
    DELETE /api/projects/{project_id} - プロジェクト削除
    """

    permission_classes = [IsAuthenticated]

    def _get_project(self, project_id: str) -> Project:
        project = get_object_or_404(
            Project.objects.prefetch_related("members", "tasks"), project_id=project_id
        )
        return project

    def _assert_assigned_or_staff(self, project: Project):
        user = self.request.user
        if not (project.members.filter(pk=user.pk).exists() or user.is_staff):
            raise PermissionDenied(ERROR_NOT_ASSIGNED_TO_PROJECT)

    def get(self, request, project_id: str) -> Response:
        project = self._get_project(project_id)
        self._assert_assigned_or_staff(project)
        serializer = ProjectResponseSerializer(project)
        return Response(serializer.data)

    def put(self, request, project_id: str) -> Response:
        project = self._get_project(project_id)
        self._assert_assigned_or_staff(project)

        serializer = ProjectCreateSerializer(
            project, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = ProjectResponseSerializer(project)
        return Response(response_serializer.data)

    def patch(self, request, project_id: str) -> Response:
        project = self._get_project(project_id)
        self._assert_assigned_or_staff(project)

        serializer = ProjectCreateSerializer(
            project, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = ProjectResponseSerializer(project)
        return Response(response_serializer.data)

    def delete(self, request, project_id: str) -> Response:
        project = self._get_project(project_id)
        self._assert_assigned_or_staff(project)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
