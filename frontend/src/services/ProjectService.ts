import api from "../api";
import type { Project } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

export interface ProjectFormData {
  title: string;
  description?: string;
  start_date?: string;
  deadline?: string;
  status?: string;
  progress?: number;
  members?: number[];
}

interface ProjectsResponse {
  projects: Project[];
}

export function createProject(projectData: ProjectFormData): Promise<Project> {
  return apiWrapper(() => api.post("/api/projects/", projectData), "Create project");
}

export async function getProjects(): Promise<Project[]> {
  const data = await apiWrapper<ProjectsResponse>(() => api.get("/api/projects/"), "Get projects");
  return data.projects;
}

export function getProjectById(projectId: string): Promise<Project> {
  return apiWrapper(() => api.get(`/api/projects/${projectId}/`), "Get project by ID");
}

export function updateProject(
  projectId: string,
  projectData: Partial<ProjectFormData>,
): Promise<Project> {
  return apiWrapper(() => api.put(`/api/projects/${projectId}/`, projectData), "Update project");
}
