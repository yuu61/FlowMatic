import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL } from "./constants";

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function getCsrfToken(): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrftoken") {
      return value ?? null;
    }
  }
  return null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (["post", "put", "patch", "delete"].includes(config.method || "")) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/")
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/api/auth/refresh/");
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export async function initializeCsrf(): Promise<void> {
  try {
    await api.get("/api/auth/csrf/");
  } catch {
    console.error("Failed to initialize CSRF token");
  }
}

export default api;
