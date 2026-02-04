from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project

from .models import ProjectFile

User = get_user_model()


class ProjectFileListCreateTests(APITestCase):
    """プロジェクトファイル一覧・作成APIのテスト"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="password123"
        )
        self.member = User.objects.create_user(
            username="member", email="member@example.com", password="password123"
        )
        self.stranger = User.objects.create_user(
            username="stranger", email="stranger@example.com", password="password123"
        )

        self.project = Project.objects.create(
            title="Test Project",
            description="Test Description",
            start_date="2024-01-01T00:00:00Z",
            deadline="2024-12-31T00:00:00Z",
        )
        self.project.members.add(self.user, self.member)

        self.url = f"/api/projects/{self.project.project_id}/files/"

    def test_list_files_success(self):
        """メンバーがファイル一覧取得"""
        self.client.force_authenticate(user=self.user)

        # テスト用ファイル作成
        test_file = SimpleUploadedFile(
            "test.txt", b"test content", content_type="text/plain"
        )
        ProjectFile.objects.create(
            project=self.project, uploader=self.user, file=test_file, name="test.txt"
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "test.txt")

    def test_list_files_non_member_rejected(self):
        """非メンバー拒否"""
        self.client.force_authenticate(user=self.stranger)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_file_success(self):
        """ファイルアップロード成功"""
        self.client.force_authenticate(user=self.user)
        test_file = SimpleUploadedFile(
            "upload_test.txt", b"upload content", content_type="text/plain"
        )
        data = {"file": test_file, "name": "uploaded_file.txt"}

        response = self.client.post(self.url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "uploaded_file.txt")
        self.assertTrue(
            ProjectFile.objects.filter(
                project=self.project, name="uploaded_file.txt"
            ).exists()
        )

    def test_upload_file_auto_name(self):
        """ファイル名自動取得"""
        self.client.force_authenticate(user=self.user)
        test_file = SimpleUploadedFile(
            "auto_name.txt", b"auto content", content_type="text/plain"
        )
        data = {"file": test_file}

        response = self.client.post(self.url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "auto_name.txt")

    def test_upload_file_non_member_rejected(self):
        """非メンバー拒否"""
        self.client.force_authenticate(user=self.stranger)
        test_file = SimpleUploadedFile(
            "hack.txt", b"hack content", content_type="text/plain"
        )
        data = {"file": test_file, "name": "hack.txt"}

        response = self.client.post(self.url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ProjectFileDeleteTests(APITestCase):
    """プロジェクトファイル削除APIのテスト"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="password123"
        )
        self.member = User.objects.create_user(
            username="member", email="member@example.com", password="password123"
        )
        self.stranger = User.objects.create_user(
            username="stranger", email="stranger@example.com", password="password123"
        )

        self.project = Project.objects.create(
            title="Test Project",
            description="Test Description",
            start_date="2024-01-01T00:00:00Z",
            deadline="2024-12-31T00:00:00Z",
        )
        self.project.members.add(self.user, self.member)

    def test_delete_file_success(self):
        """ファイル削除成功"""
        self.client.force_authenticate(user=self.user)
        test_file = SimpleUploadedFile(
            "delete_test.txt", b"delete content", content_type="text/plain"
        )
        file_obj = ProjectFile.objects.create(
            project=self.project, uploader=self.user, file=test_file, name="delete.txt"
        )
        url = f"/api/projects/{self.project.project_id}/files/{file_obj.file_id}/"

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProjectFile.objects.filter(file_id=file_obj.file_id).exists())

    def test_delete_file_removes_from_storage(self):
        """ストレージから実削除（モデルのdeleteメソッドが呼ばれることを検証）"""
        self.client.force_authenticate(user=self.user)
        test_file = SimpleUploadedFile(
            "storage_test.txt", b"storage content", content_type="text/plain"
        )
        file_obj = ProjectFile.objects.create(
            project=self.project,
            uploader=self.user,
            file=test_file,
            name="storage.txt",
        )
        file_path = file_obj.file.name
        url = f"/api/projects/{self.project.project_id}/files/{file_obj.file_id}/"

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # DBから削除されたことを確認
        self.assertFalse(ProjectFile.objects.filter(file_id=file_obj.file_id).exists())

        # ストレージからも削除されたことを確認（ファイルが存在しない）
        from django.core.files.storage import default_storage

        self.assertFalse(default_storage.exists(file_path))

    def test_delete_file_non_member_rejected(self):
        """非メンバー拒否"""
        test_file = SimpleUploadedFile(
            "hack_delete.txt", b"hack content", content_type="text/plain"
        )
        file_obj = ProjectFile.objects.create(
            project=self.project,
            uploader=self.user,
            file=test_file,
            name="hack_delete.txt",
        )
        url = f"/api/projects/{self.project.project_id}/files/{file_obj.file_id}/"

        self.client.force_authenticate(user=self.stranger)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(ProjectFile.objects.filter(file_id=file_obj.file_id).exists())
