from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import ERROR_NOT_PROJECT_MEMBER
from projects.models import Project

from .models import ProjectFile
from .serializers import ProjectFileSerializer


class ProjectFileListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, project_id):
        project = get_object_or_404(Project, project_id=project_id)
        if not project.members.filter(pk=request.user.pk).exists():
            raise PermissionDenied(ERROR_NOT_PROJECT_MEMBER)
        files = ProjectFile.objects.filter(project=project).order_by("-uploaded_at")
        serializer = ProjectFileSerializer(files, many=True)
        return Response(serializer.data)

    def post(self, request, project_id):
        project = get_object_or_404(Project, project_id=project_id)
        if not project.members.filter(pk=request.user.pk).exists():
            raise PermissionDenied(ERROR_NOT_PROJECT_MEMBER)

        # Create a mutable copy of request.data
        data = request.data.copy()

        # If name is not provided, get it from the uploaded file
        if "name" not in data and "file" in request.FILES:
            data["name"] = request.FILES["file"].name

        serializer = ProjectFileSerializer(data=data)
        if serializer.is_valid():
            serializer.save(project=project, uploader=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectFileDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, project_id, file_id):
        project = get_object_or_404(Project, project_id=project_id)
        if not project.members.filter(pk=request.user.pk).exists():
            raise PermissionDenied(ERROR_NOT_PROJECT_MEMBER)
        file_obj = get_object_or_404(
            ProjectFile, project_id=project_id, file_id=file_id
        )
        file_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
