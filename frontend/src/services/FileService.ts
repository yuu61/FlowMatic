import api from "../api";
import { API_BASE_URL } from "../constants";
import type { ProjectFile } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

export interface FileUploadData {
  file: File;
  name?: string;
}

export function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  return apiWrapper(() => api.get(`/api/projects/${projectId}/files/`), "Get project files");
}

export function uploadProjectFile(projectId: string, data: FileUploadData): Promise<ProjectFile> {
  const formData = new FormData();
  formData.append("file", data.file);

  if (data.name) formData.append("name", data.name);

  return apiWrapper(
    () =>
      api.post(`/api/projects/${projectId}/files/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    "Upload file",
  );
}

export async function deleteProjectFile(projectId: string, fileId: string): Promise<void> {
  await apiWrapper(() => api.delete(`/api/projects/${projectId}/files/${fileId}/`), "Delete file");
}

export async function downloadProjectFile(fileUrl: string, fileName: string): Promise<void> {
  const fullUrl = fileUrl.startsWith("http") ? fileUrl : `${API_BASE_URL}/${fileUrl}`;

  const response = await apiWrapper<Blob>(
    () =>
      api.get(fullUrl, {
        responseType: "blob",
      }),
    "Download file",
  );

  const blob = new Blob([response], {
    type: "application/octet-stream",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
