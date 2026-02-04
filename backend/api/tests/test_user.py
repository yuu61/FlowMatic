from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class UserRegistrationTests(APITestCase):
    """ユーザー登録APIのテスト"""

    def setUp(self):
        self.url = reverse("register")

    def test_register_user_success(self):
        """正常なユーザー登録"""
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "newuser")
        self.assertEqual(response.data["email"], "newuser@example.com")
        self.assertTrue(User.objects.filter(email="newuser@example.com").exists())

    def test_register_duplicate_email_rejected(self):
        """重複メール拒否"""
        User.objects.create_user(
            username="existing", email="existing@example.com", password="password123"
        )
        data = {
            "username": "newuser",
            "email": "existing@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_duplicate_email_case_insensitive(self):
        """大文字小文字区別なしでの重複メール拒否"""
        User.objects.create_user(
            username="existing", email="existing@example.com", password="password123"
        )
        data = {
            "username": "newuser",
            "email": "EXISTING@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_password_mismatch_rejected(self):
        """パスワード確認不一致拒否"""
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "confirm_password": "DifferentPass456!",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)


class EmailLoginTests(APITestCase):
    """メールログインAPIのテスト"""

    def setUp(self):
        self.url = reverse("auth-login")
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="TestPass123!"
        )

    def test_login_success(self):
        """正常ログイン（user返却とCookie設定）"""
        data = {"email": "test@example.com", "password": "TestPass123!"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "test@example.com")
        # Cookieにトークンが設定されていることを確認
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_login_invalid_credentials(self):
        """認証失敗"""
        data = {"email": "test@example.com", "password": "WrongPassword!"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user_rejected(self):
        """非アクティブユーザー拒否"""
        self.user.is_active = False
        self.user.save()
        data = {"email": "test@example.com", "password": "TestPass123!"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserListTests(APITestCase):
    """ユーザー一覧APIのテスト"""

    def setUp(self):
        self.url = reverse("user-list")
        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="password123"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="password123"
        )
        self.user3 = User.objects.create_user(
            username="user3", email="user3@example.com", password="password123"
        )

    def test_list_users_authenticated(self):
        """認証済みユーザーが一覧取得"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 自分以外のユーザーが返される
        self.assertEqual(len(response.data), 2)

    def test_list_users_excludes_current_user(self):
        """自分自身を除外"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [u["email"] for u in response.data]
        self.assertNotIn("user1@example.com", emails)
        self.assertIn("user2@example.com", emails)
        self.assertIn("user3@example.com", emails)

    def test_list_users_unauthenticated_rejected(self):
        """未認証拒否"""
        response = self.client.get(self.url)
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )


class UserUpdateTests(APITestCase):
    """ユーザー更新APIのテスト"""

    def setUp(self):
        self.url = reverse("user-update")
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="password123"
        )

    def test_update_username_success(self):
        """ユーザー名更新"""
        self.client.force_authenticate(user=self.user)
        data = {"username": "newusername"}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "newusername")
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newusername")

    def test_update_profile_picture_delete(self):
        """profile_picture=Noneで削除"""
        self.client.force_authenticate(user=self.user)
        data = {"profile_picture": None}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.profile_picture)

    def test_update_unauthenticated_rejected(self):
        """未認証拒否"""
        data = {"username": "hackedname"}
        response = self.client.patch(self.url, data, format="json")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )


class ChangePasswordTests(APITestCase):
    """パスワード変更APIのテスト"""

    def setUp(self):
        self.url = reverse("change-password")
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="OldPass123!"
        )

    def test_change_password_success(self):
        """正常なパスワード変更"""
        self.client.force_authenticate(user=self.user)
        data = {
            "current_password": "OldPass123!",
            "new_password": "NewSecurePass456!",
            "confirm_password": "NewSecurePass456!",
        }
        response = self.client.put(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecurePass456!"))

    def test_change_password_wrong_current(self):
        """現在のパスワード不正"""
        self.client.force_authenticate(user=self.user)
        data = {
            "current_password": "WrongCurrentPass!",
            "new_password": "NewSecurePass456!",
            "confirm_password": "NewSecurePass456!",
        }
        response = self.client.put(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.data)

    def test_change_password_weak_password(self):
        """パスワード強度不足"""
        self.client.force_authenticate(user=self.user)
        data = {
            "current_password": "OldPass123!",
            "new_password": "weak",
            "confirm_password": "weak",
        }
        response = self.client.put(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # パスワード強度エラーはnew_passwordまたはnon_field_errorsに返される
        self.assertTrue(
            "new_password" in response.data or "non_field_errors" in response.data
        )

    def test_change_password_unauthenticated_rejected(self):
        """未認証拒否"""
        data = {
            "current_password": "OldPass123!",
            "new_password": "NewSecurePass456!",
            "confirm_password": "NewSecurePass456!",
        }
        response = self.client.put(self.url, data, format="json")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )
