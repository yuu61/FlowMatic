import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveImageUrl } from "./resolveImageUrl";

describe("resolveImageUrl", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return undefined for null", () => {
    expect(resolveImageUrl(null)).toBeUndefined();
  });

  it("should return undefined for undefined", () => {
    expect(resolveImageUrl(undefined)).toBeUndefined();
  });

  it("should return undefined for data: URL (XSS prevention)", () => {
    expect(resolveImageUrl("data:image/png;base64,abc123")).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("Blocked data: URL for security");
  });

  it("should return blob: URL as-is (trusted local preview)", () => {
    const blobUrl = "blob:http://localhost:3000/abc-123-def";
    expect(resolveImageUrl(blobUrl)).toBe(blobUrl);
  });

  it("should prefix relative URL with API_BASE_URL", () => {
    expect(resolveImageUrl("/media/images/test.png")).toBe(
      "http://localhost:8000/media/images/test.png",
    );
  });

  it("should handle relative URL without leading slash", () => {
    expect(resolveImageUrl("media/images/test.png")).toBe(
      "http://localhost:8000/media/images/test.png",
    );
  });

  it("should allow ui-avatars.com domain", () => {
    const url = "https://ui-avatars.com/api/?name=John";
    expect(resolveImageUrl(url)).toBe(url);
  });

  it("should allow localhost domain", () => {
    const url = "http://localhost:8000/media/image.png";
    expect(resolveImageUrl(url)).toBe(url);
  });

  it("should allow subdomains of allowed domains", () => {
    const url = "https://api.ui-avatars.com/api/?name=John";
    expect(resolveImageUrl(url)).toBe(url);
  });

  it("should return undefined for untrusted domain", () => {
    expect(resolveImageUrl("https://evil.com/image.png")).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("Blocked untrusted image URL domain: evil.com");
  });

  it("should return undefined for invalid URL format", () => {
    expect(resolveImageUrl("http://[invalid")).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("Invalid image URL format: http://[invalid");
  });
});
