import api from "../api";
import type { Project } from "../types";

export interface ProjectFormData {
  title: string;
  description?: string;
  start_date?: string;
  deadline?: string;
  status?: string;
  progress?: number;
  members?: number[];
}

export async function createProject(projectData: ProjectFormData): Promise<Project> {
  try {
    const response = await api.post("/api/projects/", projectData);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    const response = await api.get("/api/projects/");
    return response.data.projects;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getProjectById(projectId: string): Promise<Project> {
  try {
    const response = await api.get(`/api/projects/${projectId}/`);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function updateProject(
  projectId: string,
  projectData: Partial<ProjectFormData>,
): Promise<Project> {
  try {
    const response = await api.put(`/api/projects/${projectId}/`, projectData);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
