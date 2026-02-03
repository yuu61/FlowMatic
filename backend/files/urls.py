from django.urls import path

from .views import ProjectFileDetailView, ProjectFileListCreateView

urlpatterns = [
    path(
        "projects/<uuid:project_id>/files/",
        ProjectFileListCreateView.as_view(),
        name="project-file-list",
    ),
    path(
        "projects/<uuid:project_id>/files/<uuid:file_id>/",
        ProjectFileDetailView.as_view(),
        name="project-file-detail",
    ),
]
