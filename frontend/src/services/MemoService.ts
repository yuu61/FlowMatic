import api from "../api";
import type { Memo, MemoFormData } from "../types";
import { apiWrapper } from "../utils/apiWrapper";

export function createMemo(projectId: string, memoData: MemoFormData): Promise<Memo> {
  return apiWrapper(() => api.post(`/api/projects/${projectId}/memos/`, memoData), "Create memo");
}

export function getMemos(projectId: string): Promise<Memo[]> {
  return apiWrapper(() => api.get(`/api/projects/${projectId}/memos/`), "Get memos");
}

export function updateMemo(
  projectId: string,
  memoId: string,
  memoData: Partial<MemoFormData>,
): Promise<Memo> {
  return apiWrapper(
    () => api.patch(`/api/projects/${projectId}/memos/${memoId}/`, memoData),
    "Update memo",
  );
}

export async function deleteMemo(projectId: string, memoId: string): Promise<void> {
  await apiWrapper(() => api.delete(`/api/projects/${projectId}/memos/${memoId}/`), "Delete memo");
}
