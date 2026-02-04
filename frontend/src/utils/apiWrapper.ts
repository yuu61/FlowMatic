import { AxiosResponse } from "axios";

/**
 * Wrapper function for API calls with consistent error handling
 * @param apiCall - The API call function to execute
 * @param context - Description of the API operation for error logging
 * @returns The response data from the API call
 */
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
