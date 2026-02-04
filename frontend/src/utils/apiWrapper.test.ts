import type { AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiWrapper } from "./apiWrapper";

describe("apiWrapper", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("response.data extraction", () => {
    it("should extract only data property from response object", async () => {
      const mockData = { id: 1, name: "Test" };
      const fullResponse: AxiosResponse = {
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        config: { url: "/api/test", headers: {} as AxiosResponse["config"]["headers"] },
      };
      const mockApiCall = vi.fn().mockResolvedValue(fullResponse);

      const result = await apiWrapper(mockApiCall, "Test context");

      // Verify that only data is returned, not the full response
      expect(result).toEqual(mockData);
      expect(result).not.toHaveProperty("status");
      expect(result).not.toHaveProperty("statusText");
      expect(result).not.toHaveProperty("headers");
      expect(result).not.toHaveProperty("config");
    });

    it("should return array data correctly", async () => {
      const mockData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const fullResponse: AxiosResponse = {
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: { url: "/api/items", headers: {} as AxiosResponse["config"]["headers"] },
      };
      const mockApiCall = vi.fn().mockResolvedValue(fullResponse);

      const result = await apiWrapper(mockApiCall, "Get items");

      expect(result).toEqual(mockData);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("should work with generic types and preserve type structure", async () => {
      interface User {
        id: number;
        username: string;
        email: string;
      }

      const mockUser: User = { id: 1, username: "testuser", email: "test@example.com" };
      const fullResponse: AxiosResponse<User> = {
        data: mockUser,
        status: 200,
        statusText: "OK",
        headers: { "x-request-id": "abc123" },
        config: { url: "/api/users/1", headers: {} as AxiosResponse["config"]["headers"] },
      };
      const mockApiCall = vi.fn().mockResolvedValue(fullResponse);

      const result = await apiWrapper<User>(mockApiCall, "Get user");

      expect(result).toEqual(mockUser);
      expect(result.id).toBe(1);
      expect(result.username).toBe("testuser");
      expect(result.email).toBe("test@example.com");
    });
  });

  describe("null/undefined data handling", () => {
    it("should return null when response.data is null", async () => {
      const fullResponse: AxiosResponse<null> = {
        data: null,
        status: 204,
        statusText: "No Content",
        headers: {},
        config: { url: "/api/resource", headers: {} as AxiosResponse["config"]["headers"] },
      };
      const mockApiCall = vi.fn().mockResolvedValue(fullResponse);

      const result = await apiWrapper<null>(mockApiCall, "Delete resource");

      expect(result).toBeNull();
    });

    it("should return undefined when response.data is undefined", async () => {
      const fullResponse: AxiosResponse<undefined> = {
        data: undefined,
        status: 204,
        statusText: "No Content",
        headers: {},
        config: { url: "/api/resource", headers: {} as AxiosResponse["config"]["headers"] },
      };
      const mockApiCall = vi.fn().mockResolvedValue(fullResponse);

      const result = await apiWrapper<undefined>(mockApiCall, "Delete resource");

      expect(result).toBeUndefined();
    });

    it("should return empty string when response.data is empty string", async () => {
      const fullResponse: AxiosResponse<string> = {
        data: "",
        status: 200,
        statusText: "OK",
        headers: {},
        config: { url: "/api/text", headers: {} as AxiosResponse["config"]["headers"] },
      };
      const mockApiCall = vi.fn().mockResolvedValue(fullResponse);

      const result = await apiWrapper<string>(mockApiCall, "Get text");

      expect(result).toBe("");
    });
  });

  describe("error handling and logging", () => {
    it("should log error with correct context and rethrow Error instance", async () => {
      const mockError = new Error("Network error");
      const mockApiCall = vi.fn().mockRejectedValue(mockError);

      await expect(apiWrapper(mockApiCall, "Fetch data")).rejects.toThrow("Network error");

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("Fetch data Error:", mockError);
    });

    it("should log and rethrow when rejected with a string", async () => {
      const errorString = "Something went wrong";
      const mockApiCall = vi.fn().mockRejectedValue(errorString);

      await expect(apiWrapper(mockApiCall, "String error")).rejects.toBe(errorString);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("String error Error:", errorString);
    });

    it("should log and rethrow when rejected with an object", async () => {
      const errorObject = { code: "ERR_001", message: "Custom error" };
      const mockApiCall = vi.fn().mockRejectedValue(errorObject);

      await expect(apiWrapper(mockApiCall, "Object error")).rejects.toEqual(errorObject);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("Object error Error:", errorObject);
    });

    it("should log and rethrow when rejected with null", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(null);

      await expect(apiWrapper(mockApiCall, "Null error")).rejects.toBeNull();

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("Null error Error:", null);
    });

    it("should log and rethrow when rejected with undefined", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(undefined);

      await expect(apiWrapper(mockApiCall, "Undefined error")).rejects.toBeUndefined();

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("Undefined error Error:", undefined);
    });

    it("should preserve error context message format", async () => {
      const mockError = new Error("API failed");
      const mockApiCall = vi.fn().mockRejectedValue(mockError);
      const context = "CreateUser";

      await expect(apiWrapper(mockApiCall, context)).rejects.toThrow();

      const [loggedMessage] = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(loggedMessage).toBe("CreateUser Error:");
      expect(loggedMessage).toMatch(/^.+ Error:$/);
    });
  });

  describe("api call invocation", () => {
    it("should call the api function exactly once", async () => {
      const mockApiCall = vi.fn().mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} as AxiosResponse["config"]["headers"] },
      });

      await apiWrapper(mockApiCall, "Single call test");

      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it("should not call api function again on error", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error("Failed"));

      await expect(apiWrapper(mockApiCall, "No retry")).rejects.toThrow();

      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });
  });
});
