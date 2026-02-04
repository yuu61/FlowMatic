import api from "../api";
import type { Task, TaskFormData } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

interface TasksResponse {
  tasks: Task[];
}

export function createTask(projectId: string, taskData: TaskFormData): Promise<Task> {
  return apiWrapper(() => api.post(`/api/projects/${projectId}/tasks/`, taskData), "Create task");
}

export async function getTasks(projectId: string): Promise<Task[]> {
  const data = await apiWrapper<TasksResponse>(
    () => api.get(`/api/projects/${projectId}/tasks/`),
    "Get tasks",
  );
  return data.tasks;
}

export function getTaskById(projectId: string, taskId: string): Promise<Task> {
  return apiWrapper(() => api.get(`/api/projects/${projectId}/tasks/${taskId}/`), "Get task by ID");
}

export function updateTask(
  projectId: string,
  taskId: string,
  taskData: Partial<TaskFormData>,
): Promise<Task> {
  return apiWrapper(
    () => api.put(`/api/projects/${projectId}/tasks/${taskId}/`, taskData),
    "Update task",
  );
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await apiWrapper(() => api.delete(`/api/projects/${projectId}/tasks/${taskId}/`), "Delete task");
}
