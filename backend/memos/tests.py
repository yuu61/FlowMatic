from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Project

from .models import ProjectMemo

User = get_user_model()


class ProjectMemoListCreateTests(APITestCase):
    """プロジェクトメモ一覧・作成APIのテスト"""

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

        self.url = f"/api/projects/{self.project.project_id}/memos/"

    def test_list_memos_success(self):
        """メンバーがメモ一覧取得"""
        self.client.force_authenticate(user=self.user)

        ProjectMemo.objects.create(
            project=self.project, user=self.user, content="Test memo 1"
        )
        ProjectMemo.objects.create(
            project=self.project, user=self.member, content="Test memo 2"
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_memos_ordered_by_pinned_and_created(self):
        """並び順検証（ピン留め→作成日時降順）"""
        self.client.force_authenticate(user=self.user)

        memo1 = ProjectMemo.objects.create(
            project=self.project, user=self.user, content="First memo", is_pinned=False
        )
        memo2 = ProjectMemo.objects.create(
            project=self.project, user=self.user, content="Second memo", is_pinned=True
        )
        memo3 = ProjectMemo.objects.create(
            project=self.project, user=self.user, content="Third memo", is_pinned=False
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # ピン留めされたものが最初
        self.assertEqual(response.data[0]["content"], "Second memo")
        self.assertTrue(response.data[0]["is_pinned"])

    def test_list_memos_non_member_rejected(self):
        """非メンバー拒否"""
        self.client.force_authenticate(user=self.stranger)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_memo_success(self):
        """メモ作成成功"""
        self.client.force_authenticate(user=self.user)
        data = {"content": "New memo content"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "New memo content")
        self.assertTrue(
            ProjectMemo.objects.filter(
                project=self.project, content="New memo content"
            ).exists()
        )

    def test_create_memo_with_color(self):
        """色指定でメモ作成"""
        self.client.force_authenticate(user=self.user)
        data = {"content": "Blue memo", "color": "blue"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["color"], "blue")

    def test_create_memo_non_member_rejected(self):
        """非メンバー拒否"""
        self.client.force_authenticate(user=self.stranger)
        data = {"content": "Hacked memo"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ProjectMemoDetailTests(APITestCase):
    """プロジェクトメモ詳細APIのテスト"""

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

        self.memo = ProjectMemo.objects.create(
            project=self.project, user=self.user, content="Original content"
        )
        self.url = f"/api/projects/{self.project.project_id}/memos/{self.memo.memo_id}/"

    def test_get_memo_detail_success(self):
        """メモ詳細取得"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "Original content")

    def test_update_memo_by_owner_success(self):
        """所有者が更新"""
        self.client.force_authenticate(user=self.user)
        data = {"content": "Updated content"}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "Updated content")
        self.memo.refresh_from_db()
        self.assertEqual(self.memo.content, "Updated content")

    def test_update_memo_by_non_owner_rejected(self):
        """非所有者の更新拒否"""
        self.client.force_authenticate(user=self.member)
        data = {"content": "Hacked content"}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.memo.refresh_from_db()
        self.assertEqual(self.memo.content, "Original content")

    def test_delete_memo_by_owner_success(self):
        """所有者が削除"""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProjectMemo.objects.filter(memo_id=self.memo.memo_id).exists())

    def test_delete_memo_by_non_owner_rejected(self):
        """非所有者の削除拒否"""
        self.client.force_authenticate(user=self.member)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(ProjectMemo.objects.filter(memo_id=self.memo.memo_id).exists())
