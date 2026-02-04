import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../api";
import { changeUserPassword, getUsers, updateUserProfile } from "./UserService";

// Mock the api module
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApiGet = api.get as ReturnType<typeof vi.fn>;
const mockedApiPatch = api.patch as ReturnType<typeof vi.fn>;
const mockedApiPut = api.put as ReturnType<typeof vi.fn>;

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getUsers", () => {
    it("should return user list on success", async () => {
      const mockUsers = [
        {
          id: 1,
          username: "user1",
          email: "user1@example.com",
          profile_picture: null,
          date_joined: "2024-01-01",
        },
        {
          id: 2,
          username: "user2",
          email: "user2@example.com",
          profile_picture: null,
          date_joined: "2024-01-01",
        },
      ];

      mockedApiGet.mockResolvedValue({ data: mockUsers });

      const users = await getUsers();

      expect(users).toHaveLength(2);
      expect(users[0]).toHaveProperty("username", "user1");
      expect(users[1]).toHaveProperty("username", "user2");
      expect(mockedApiGet).toHaveBeenCalledWith("/api/users/");
    });

    it("should throw error on failure", async () => {
      mockedApiGet.mockRejectedValue(new Error("Unauthorized"));

      await expect(getUsers()).rejects.toThrow("Unauthorized");
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("updateUserProfile", () => {
    it("should build FormData with username and call API with correct endpoint", async () => {
      mockedApiPatch.mockResolvedValue({ data: {} });

      await updateUserProfile({ username: "newname" });

      // Verify API is called with correct endpoint and Content-Type
      expect(mockedApiPatch).toHaveBeenCalledWith("/api/users/update/", expect.any(FormData), {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Verify FormData is built correctly
      const callArgs = mockedApiPatch.mock.calls[0] as unknown[];
      const formData = callArgs[1] as FormData;
      expect(formData.get("username")).toBe("newname");
      expect(formData.has("profile_picture")).toBe(false);
    });

    it("should build FormData with empty string for profile picture deletion", async () => {
      mockedApiPatch.mockResolvedValue({ data: {} });

      await updateUserProfile({ profile_picture: null });

      // Verify FormData contains empty string for deletion
      const callArgs = mockedApiPatch.mock.calls[0] as unknown[];
      const formData = callArgs[1] as FormData;
      expect(formData.get("profile_picture")).toBe("");
      expect(formData.has("username")).toBe(false);
    });

    it("should build FormData with File object for profile picture upload", async () => {
      const mockFile = new File(["test"], "test.png", { type: "image/png" });
      mockedApiPatch.mockResolvedValue({ data: {} });

      await updateUserProfile({ profile_picture: mockFile });

      // Verify FormData contains the file
      const callArgs = mockedApiPatch.mock.calls[0] as unknown[];
      const formData = callArgs[1] as FormData;
      expect(formData.get("profile_picture")).toBe(mockFile);
    });

    it("should build FormData with both username and profile picture", async () => {
      const mockFile = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
      mockedApiPatch.mockResolvedValue({ data: {} });

      await updateUserProfile({ username: "updateduser", profile_picture: mockFile });

      // Verify FormData contains both fields
      const callArgs = mockedApiPatch.mock.calls[0] as unknown[];
      const formData = callArgs[1] as FormData;
      expect(formData.get("username")).toBe("updateduser");
      expect(formData.get("profile_picture")).toBe(mockFile);
    });

    it("should throw error on file size exceeded (413)", async () => {
      const error = {
        response: {
          status: 413,
          data: { detail: "File too large" },
        },
      };
      mockedApiPatch.mockRejectedValue(error);

      const largeFile = new File(["x".repeat(1000)], "large.png", { type: "image/png" });

      await expect(updateUserProfile({ profile_picture: largeFile })).rejects.toMatchObject({
        response: { status: 413 },
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("changeUserPassword", () => {
    it("should call API with correctly mapped password fields", async () => {
      mockedApiPut.mockResolvedValue({ data: { message: "Success" } });

      await changeUserPassword({
        currentPassword: "oldpass123",
        newPassword: "newpass456",
        confirmPassword: "newpass456",
      });

      // Verify API is called with correct endpoint and snake_case field mapping
      expect(mockedApiPut).toHaveBeenCalledWith("/api/users/me/password/", {
        current_password: "oldpass123",
        new_password: "newpass456",
        confirm_password: "newpass456",
      });
      expect(mockedApiPut).toHaveBeenCalledTimes(1);
    });

    it("should throw error when current password is incorrect", async () => {
      mockedApiPut.mockRejectedValue(new Error("Current password is incorrect"));

      await expect(
        changeUserPassword({
          currentPassword: "wrongpass",
          newPassword: "newpass456",
          confirmPassword: "newpass456",
        }),
      ).rejects.toThrow("Current password is incorrect");
    });

    it("should throw error on validation failure (400)", async () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            new_password: ["Password must be at least 8 characters"],
            confirm_password: ["Passwords do not match"],
          },
        },
      };
      mockedApiPut.mockRejectedValue(validationError);

      await expect(
        changeUserPassword({
          currentPassword: "oldpass123",
          newPassword: "short",
          confirmPassword: "mismatch",
        }),
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            new_password: ["Password must be at least 8 characters"],
            confirm_password: ["Passwords do not match"],
          },
        },
      });
      expect(console.error).toHaveBeenCalled();
    });
  });
});
