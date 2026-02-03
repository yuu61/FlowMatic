import api from "../api";
import type { Comment, CommentFormData } from "../types";

export async function createComment(
  projectId: string,
  taskId: string,
  commentData: CommentFormData,
): Promise<Comment> {
  try {
    const response = await api.post(
      `/api/projects/${projectId}/tasks/${taskId}/comments/`,
      commentData,
    );
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getComments(projectId: string, taskId: string): Promise<Comment[]> {
  try {
    const response = await api.get(`/api/projects/${projectId}/tasks/${taskId}/comments/`);
    return response.data.comments;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
