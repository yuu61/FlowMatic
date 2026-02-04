/**
 * @deprecated トークンはhttpOnly Cookieに保存されます。
 * この定数は後方互換性のために残されています。
 */
export const ACCESS_TOKEN = "access";

/**
 * @deprecated トークンはhttpOnly Cookieに保存されます。
 * この定数は後方互換性のために残されています。
 */
export const REFRESH_TOKEN = "refresh";

/**
 * @deprecated ユーザー情報はサーバーから取得されます。
 * この定数は後方互換性のために残されています。
 */
export const CURRENT_USER = "user";

export const CURRENT_PROJECT_ID = "currentProjectId";

export const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) || "http://localhost:8000";
// Security: Default to wss:// (encrypted) in production
// Use ws:// only for local development when explicitly configured
export const WS_BASE_URL =
  (import.meta.env["VITE_WS_URL"] as string | undefined) ||
  (import.meta.env["PROD"] ? "wss://localhost:8000" : "ws://localhost:8000");

export const PROJECT_STATUS = {
  PLANNING: "planning",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export type ProjectStatusType = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const TASK_STATUS = {
  TODO: "todo",
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  TESTING: "testing",
  DONE: "done",
} as const;

export type TaskStatusType = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const ACTIVE_TASK_STATUSES = [
  TASK_STATUS.TODO,
  TASK_STATUS.PENDING,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.IN_REVIEW,
  TASK_STATUS.TESTING,
] as const;

export const TASK_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type TaskPriorityType = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const NOTIFICATION_TIMEOUT_MS = 3000;
export const DEBOUNCE_DELAY_MS = 300;
export const UNDO_TIMEOUT_MS = 5000;

export const DEADLINE_NEAR_DAYS = 7;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const FALLBACK_AVATAR_URL = "https://ui-avatars.com/api/";

export const APP_NAME = "FlowMatic";
