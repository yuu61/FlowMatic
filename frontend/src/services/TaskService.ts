import api from "../api";
import type { Task, TaskFormData } from "../types";

export async function createTask(projectId: string, taskData: TaskFormData): Promise<Task> {
  try {
    const response = await api.post(`/api/projects/${projectId}/tasks/`, taskData);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getTasks(projectId: string): Promise<Task[]> {
  try {
    const response = await api.get(`/api/projects/${projectId}/tasks/`);
    return response.data.tasks;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getTaskById(projectId: string, taskId: string): Promise<Task> {
  const response = await api.get(`/api/projects/${projectId}/tasks/${taskId}/`);
  return response.data;
}

export async function updateTask(
  projectId: string,
  taskId: string,
  taskData: Partial<TaskFormData>,
): Promise<Task> {
  try {
    const response = await api.put(`/api/projects/${projectId}/tasks/${taskId}/`, taskData);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  try {
    await api.delete(`/api/projects/${projectId}/tasks/${taskId}/`);
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
