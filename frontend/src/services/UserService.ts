import api from "../api";
import type { User } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

export interface UserProfileUpdate {
  username?: string;
  profile_picture?: File | null;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function getUsers(): Promise<User[]> {
  return apiWrapper(() => api.get<User[]>("/api/users/"), "Get users");
}

/**
 * Update current user's profile (username + profile_picture)
 */
export function updateUserProfile(userData: UserProfileUpdate): Promise<User> {
  const formData = new FormData();

  if (userData.username) {
    formData.append("username", userData.username);
  }

  // Handle profile picture update or deletion
  if ("profile_picture" in userData) {
    if (userData.profile_picture === null) {
      // Send empty string to delete
      formData.append("profile_picture", "");
    } else if (userData.profile_picture instanceof File) {
      formData.append("profile_picture", userData.profile_picture);
    }
  }

  return apiWrapper(
    () =>
      api.patch<User>("/api/users/update/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    "Update user profile",
  );
}

/**
 * Change current user's password
 */
export function changeUserPassword(
  passwordData: PasswordChangeData,
): Promise<{ message: string }> {
  return apiWrapper(
    () =>
      api.put<{ message: string }>("/api/users/me/password/", {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword,
      }),
    "Change user password",
  );
}
