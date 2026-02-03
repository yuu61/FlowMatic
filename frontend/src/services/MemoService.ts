import api from "../api";
import type { Memo, MemoFormData } from "../types";

export async function createMemo(projectId: string, memoData: MemoFormData): Promise<Memo> {
  try {
    const response = await api.post(`/api/projects/${projectId}/memos/`, memoData);
    return response.data;
  } catch (error) {
    console.error("Create Memo API Error:", error);
    throw error;
  }
}

export async function getMemos(projectId: string): Promise<Memo[]> {
  try {
    const response = await api.get(`/api/projects/${projectId}/memos/`);
    return response.data;
  } catch (error) {
    console.error("Get Memos API Error:", error);
    throw error;
  }
}

export async function updateMemo(
  projectId: string,
  memoId: string,
  memoData: Partial<MemoFormData>,
): Promise<Memo> {
  try {
    const response = await api.patch(`/api/projects/${projectId}/memos/${memoId}/`, memoData);
    return response.data;
  } catch (error) {
    console.error("Update Memo API Error:", error);
    throw error;
  }
}

export async function deleteMemo(projectId: string, memoId: string): Promise<void> {
  try {
    await api.delete(`/api/projects/${projectId}/memos/${memoId}/`);
  } catch (error) {
    console.error("Delete Memo API Error:", error);
    throw error;
  }
}
