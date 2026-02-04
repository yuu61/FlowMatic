export interface User {
  id: number;
  username: string;
  email: string;
  profile_picture?: string | null;
  date_joined: string;
}

export type ProjectStatus = "planning" | "in_progress" | "completed";

export interface Project {
  project_id: string;
  title: string;
  description: string;
  start_date: string;
  deadline: string;
  progress: number;
  status: ProjectStatus;
  members?: ProjectMember[];
}

export interface ProjectMember {
  user_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
}

export type TaskStatus = "todo" | "pending" | "in_progress" | "in_review" | "testing" | "done";

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
  name: string;
  description: string;
  start_date: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  users: TaskUser[];
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

export type EventColor = "red" | "blue" | "green" | "orange";

export interface CalendarEvent {
  event_id: string;
  project_id: string;
  title: string;
  is_all_day: boolean;
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

export interface Chatroom {
  chatroom_id: string;
  project_id: string;
  name: string;
  description?: string;
  created_at?: string;
  members?: number[];
}

export interface ChatMessage {
  message_id: string;
  chatroom_id: string;
  user_id: number;
  username?: string;
  name: string;
  email: string;
  profile_picture?: string | null;
  content: string;
  timestamp: string;
}

export interface FileUploader {
  id: number;
  username: string;
  profile_picture?: string | null;
}

export interface ProjectFile {
  id: string;
  name: string;
  uploader: FileUploader;
  date: string;
  size: string;
  url: string;
}

export interface Comment {
  comment_id: string;
  task_id: string;
  user_id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
  content: string;
  created_at: string;
}

export interface CommentFormData {
  content: string;
  user_id?: number;
}

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
  content: string;
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
