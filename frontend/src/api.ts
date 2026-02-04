import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL } from "./constants";

// Extended config type to track retry attempts
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// CSRF token is stored in cookie, read it for requests
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
  withCredentials: true, // Cookie送信を有効化
});

// Request interceptor: CSRFトークンを追加
api.interceptors.request.use(
  (config) => {
    // 状態変更リクエストにCSRFトークンを追加
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

// Response interceptor: 401エラー時に自動リフレッシュ
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

    // 401エラーでリトライしていない場合
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/")
    ) {
      originalRequest._retry = true;

      try {
        // トークンリフレッシュを試行
        await api.post("/api/auth/refresh/");
        // リフレッシュ成功したら元のリクエストを再試行
        return api(originalRequest);
      } catch {
        // リフレッシュ失敗時はエラーをそのまま返す
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// 初期化時にCSRFトークンを取得
export async function initializeCsrf(): Promise<void> {
  try {
    await api.get("/api/auth/csrf/");
  } catch {
    console.error("Failed to initialize CSRF token");
  }
}

export default api;
