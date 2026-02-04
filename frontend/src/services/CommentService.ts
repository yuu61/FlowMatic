import api from "../api";
import type { Comment, CommentFormData } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

interface CommentsResponse {
  comments: Comment[];
}

export function createComment(
  projectId: string,
  taskId: string,
  commentData: CommentFormData,
): Promise<Comment> {
  return apiWrapper(
    () => api.post(`/api/projects/${projectId}/tasks/${taskId}/comments/`, commentData),
    "Create comment",
  );
}

export async function getComments(projectId: string, taskId: string): Promise<Comment[]> {
  const data = await apiWrapper<CommentsResponse>(
    () => api.get(`/api/projects/${projectId}/tasks/${taskId}/comments/`),
    "Get comments",
  );
  return data.comments;
}
