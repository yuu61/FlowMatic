import api from "../api";
import type { ProjectFile } from "../types";

export interface FileUploadData {
  file: File;
  name?: string;
}

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  try {
    const res = await api.get(`/api/projects/${projectId}/files/`);
    return res.data;
  } catch (err) {
    console.error("Get Files Error:", err);
    throw err;
  }
}

export async function uploadProjectFile(
  projectId: string,
  data: FileUploadData,
): Promise<ProjectFile> {
  try {
    const formData = new FormData();
    formData.append("file", data.file);

    if (data.name) formData.append("name", data.name);

    const res = await api.post(`/api/projects/${projectId}/files/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  } catch (err) {
    console.error("Upload File Error:", err);
    throw err;
  }
}

export async function deleteProjectFile(projectId: string, fileId: string): Promise<void> {
  try {
    await api.delete(`/api/projects/${projectId}/files/${fileId}/`);
  } catch (err) {
    console.error("Delete File Error:", err);
    throw err;
  }
}

export async function downloadProjectFile(fileUrl: string, fileName: string): Promise<void> {
  try {
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const fullUrl = fileUrl.startsWith("http") ? fileUrl : `${baseURL}/${fileUrl}`;

    const response = await api.get(fullUrl, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "application/octet-stream",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download File Error:", err);
    throw err;
  }
}
