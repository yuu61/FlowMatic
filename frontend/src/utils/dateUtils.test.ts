import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatDateJP, formatUTC, isDeadlineNear } from "./dateUtils";

describe("formatUTC", () => {
  it("should convert ISO string to YYYY/MM/DD HH:mm format", () => {
    expect(formatUTC("2024-01-15T10:30:00Z")).toBe("2024/01/15 10:30");
    expect(formatUTC("2024-12-31T23:59:00Z")).toBe("2024/12/31 23:59");
  });

  it("should handle midnight correctly", () => {
    expect(formatUTC("2024-06-01T00:00:00Z")).toBe("2024/06/01 00:00");
  });

  it("should handle leap year dates", () => {
    expect(formatUTC("2024-02-29T12:00:00Z")).toBe("2024/02/29 12:00");
  });
});

describe("formatDateJP", () => {
  it("should convert Date to YYYY-MM-DD format", () => {
    const date = new Date(2024, 0, 15); // January 15, 2024
    expect(formatDateJP(date)).toBe("2024-01-15");
  });

  it("should zero-pad single digit months and days", () => {
    const date = new Date(2024, 2, 5); // March 5, 2024
    expect(formatDateJP(date)).toBe("2024-03-05");
  });

  it("should handle end of year date", () => {
    const date = new Date(2024, 11, 31); // December 31, 2024
    expect(formatDateJP(date)).toBe("2024-12-31");
  });
});

describe("isDeadlineNear", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return false for null deadline", () => {
    expect(isDeadlineNear(null)).toBe(false);
  });

  it("should return false for undefined deadline", () => {
    expect(isDeadlineNear(undefined)).toBe(false);
  });

  it("should return true for deadline today (0 days)", () => {
    expect(isDeadlineNear("2024-06-15")).toBe(true);
  });

  it("should return true for deadline in 7 days (boundary)", () => {
    expect(isDeadlineNear("2024-06-22")).toBe(true);
  });

  it("should return false for deadline in 8 days (outside default threshold)", () => {
    expect(isDeadlineNear("2024-06-23")).toBe(false);
  });

  it("should return false for past deadline", () => {
    expect(isDeadlineNear("2024-06-14")).toBe(false);
  });

  it("should respect custom threshold", () => {
    // 3 days from now is 2024-06-18
    expect(isDeadlineNear("2024-06-18", 3)).toBe(true);
    expect(isDeadlineNear("2024-06-19", 3)).toBe(false);
  });

  it("should work with Date objects", () => {
    const deadline = new Date("2024-06-20T12:00:00Z");
    expect(isDeadlineNear(deadline)).toBe(true);
  });
});
