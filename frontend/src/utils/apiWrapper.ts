import { AxiosResponse } from "axios";

export async function apiWrapper<T>(
  apiCall: () => Promise<AxiosResponse<T>>,
  context: string,
): Promise<T> {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error(`${context} Error:`, error);
    throw error;
  }
}
