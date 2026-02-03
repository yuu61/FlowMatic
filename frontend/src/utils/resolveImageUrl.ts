const API_BASE = "http://localhost:8000";

export const resolveImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;

  // Already a full URL → return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Django media path
  if (path.startsWith("/media")) {
    return `${API_BASE}${path}`;
  }

  return path;
};
