import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api, { initializeCsrf } from "../api";
import { AuthProvider, useAuth } from "./AuthContext";

// Mock the api module
vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  initializeCsrf: vi.fn(),
}));

const mockedApiGet = api.get as ReturnType<typeof vi.fn>;
const mockedApiPost = api.post as ReturnType<typeof vi.fn>;
const mockedInitializeCsrf = initializeCsrf as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth", () => {
  it("should throw error when used outside of AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });
});

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set isAuthorized=true and user when auth succeeds", async () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      date_joined: "2024-01-01",
    };

    mockedInitializeCsrf.mockResolvedValue(undefined);
    mockedApiGet.mockResolvedValue({
      status: 200,
      data: { authenticated: true, user: mockUser },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthorized).toBe(true);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(mockedInitializeCsrf).toHaveBeenCalled();
  });

  it("should set isAuthorized=false when auth status returns not authenticated", async () => {
    mockedInitializeCsrf.mockResolvedValue(undefined);
    mockedApiGet.mockResolvedValue({
      status: 200,
      data: { authenticated: false },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthorized).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("should attempt token refresh when initial auth fails", async () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      date_joined: "2024-01-01",
    };

    mockedInitializeCsrf.mockResolvedValue(undefined);

    // First call fails, then refresh succeeds, then status check succeeds
    mockedApiGet.mockRejectedValueOnce(new Error("Unauthorized")).mockResolvedValueOnce({
      status: 200,
      data: { authenticated: true, user: mockUser },
    });

    mockedApiPost.mockResolvedValue({ status: 200 });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthorized).toBe(true);
    });

    expect(mockedApiPost).toHaveBeenCalledWith("/api/auth/refresh/");
    expect(result.current.user).toEqual(mockUser);
  });

  it("should set isAuthorized=false when both auth and refresh fail", async () => {
    mockedInitializeCsrf.mockResolvedValue(undefined);
    mockedApiGet.mockRejectedValue(new Error("Unauthorized"));
    mockedApiPost.mockRejectedValue(new Error("Refresh failed"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthorized).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear state even if logout API fails", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        date_joined: "2024-01-01",
      };

      mockedInitializeCsrf.mockResolvedValue(undefined);
      mockedApiGet.mockResolvedValue({
        status: 200,
        data: { authenticated: true, user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthorized).toBe(true);
      });

      // Mock logout to fail
      mockedApiPost.mockRejectedValue(new Error("Logout failed"));

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthorized).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe("refreshToken", () => {
    it("should set isAuthorized=true on successful refresh", async () => {
      mockedInitializeCsrf.mockResolvedValue(undefined);
      mockedApiGet.mockResolvedValue({
        status: 200,
        data: { authenticated: false },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthorized).toBe(false);
      });

      mockedApiPost.mockResolvedValue({ status: 200 });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.isAuthorized).toBe(true);
    });

    it("should set isAuthorized=false on failed refresh", async () => {
      mockedInitializeCsrf.mockResolvedValue(undefined);
      mockedApiGet.mockResolvedValue({
        status: 200,
        data: { authenticated: true, user: { id: 1, date_joined: "2024-01-01" } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthorized).toBe(true);
      });

      mockedApiPost.mockRejectedValue(new Error("Token expired"));

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.isAuthorized).toBe(false);
    });
  });
});
