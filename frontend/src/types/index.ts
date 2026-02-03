// ========================================
// User Types
// ========================================
export interface User {
  id: number;
  username: string;
  email: string;
  profile_picture?: string | null;
  date_joined: string;
}

// ========================================
// Project Types
// ========================================
// バックエンド: planning, in_progress, completed
export type ProjectStatus = "planning" | "in_progress" | "completed";

export interface Project {
  project_id: string;
  title: string; // バックエンドは title を使用
  description: string;
  start_date: string;
  deadline: string;
  progress: number;
  status: ProjectStatus;
  members?: ProjectMember[];
}

export interface ProjectMember {
  user_id: number;
  name: string; // バックエンドは name を使用
  email: string;
  profile_picture?: string | null;
}

// ========================================
// Task Types
// ========================================
// バックエンド: todo, pending, in_progress, in_review, testing, done
export type TaskStatus = "todo" | "pending" | "in_progress" | "in_review" | "testing" | "done";

// バックエンド: low, medium, high
export type TaskPriority = "low" | "medium" | "high";

export interface TaskUser {
  user_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
}

export interface ParentTask {
  task_id: string;
  relation_type: "FtS" | "FtF" | "StS" | "StF";
}

export interface TaskComment {
  comment_id: string;
  task_id: string;
  user_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
  content: string;
  created_at: string;
}

export interface Task {
  task_id: string;
  project_id: string;
  name: string; // バックエンドは name を使用
  description: string;
  start_date: string;
  deadline: string; // バックエンドは deadline を使用
  status: TaskStatus;
  priority: TaskPriority;
  users: TaskUser[]; // 複数ユーザー割り当て
  parent_tasks: ParentTask[];
  comments: TaskComment[];
}

export interface TaskFormData {
  name?: string;
  description?: string;
  start_date?: string;
  deadline?: string;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  assigned_user_ids?: number[];
  parent_tasks?: { task_id: string; relation_type: string }[];
}

// ========================================
// Event Types (Calendar)
// ========================================
// バックエンド: red, blue, green, orange
export type EventColor = "red" | "blue" | "green" | "orange";

export interface CalendarEvent {
  event_id: string;
  project_id: string;
  title: string;
  is_all_day: boolean; // バックエンドは is_all_day を使用
  start_date: string;
  end_date: string;
  color: EventColor;
}

export interface EventFormData {
  title: string;
  is_all_day?: boolean;
  start_date: string;
  end_date: string;
  color?: EventColor;
}

// ========================================
// Chat Types
// ========================================
export interface Chatroom {
  chatroom_id: string;
  project_id: string;
  name: string;
  members: number[];
}

export interface ChatMessage {
  message_id: string;
  chatroom_id: string;
  user_id: number;
  username?: string; // 一部のAPIレスポンスで username が返る場合がある
  name: string; // バックエンドは name を使用
  email: string;
  profile_picture?: string | null;
  content: string;
  timestamp: string; // バックエンドは timestamp を使用
}

// ========================================
// File Types
// ========================================
export interface FileUploader {
  id: number;
  username: string;
  profile_picture?: string | null;
}

export interface ProjectFile {
  id: string; // バックエンドは id を使用 (file_id)
  name: string;
  uploader: FileUploader;
  date: string; // バックエンドは date を使用 (uploaded_at から変換)
  size: string; // バックエンドは文字列形式で返す
  url: string; // ファイルURL
}

// ========================================
// Comment Types (タスクコメント用)
// ========================================
export interface Comment {
  comment_id: string;
  task_id: string;
  user_id: number;
  name: string; // バックエンドは name を使用
  email: string;
  profile_picture?: string | null;
  content: string;
  created_at: string;
}

export interface CommentFormData {
  content: string;
  user_id?: number;
}

// ========================================
// Memo Types
// ========================================
// バックエンド: yellow, blue, green
export type MemoColor = "yellow" | "blue" | "green";

export interface MemoUser {
  user_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
}

export interface Memo {
  memo_id: string;
  project_id: string;
  content: string; // バックエンドに title はない
  color: MemoColor;
  is_pinned: boolean;
  user: MemoUser;
  created_at: string;
  updated_at: string;
}

export interface MemoFormData {
  content: string;
  color?: MemoColor;
  is_pinned?: boolean;
  user_id?: number;
}

// ========================================
// API Response Types
// ========================================
export interface ApiError {
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
}

// ========================================
// Auth Types
// ========================================
export interface JwtPayload {
  exp: number;
  iat: number;
  jti: string;
  token_type: string;
  user_id: number;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}
