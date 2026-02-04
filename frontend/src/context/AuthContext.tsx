import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import api, { initializeCsrf } from "../api";
import type { User } from "../types";

// ========================================
// Context Types
// ========================================
interface AuthContextValue {
  isAuthorized: boolean | null;
  setIsAuthorized: React.Dispatch<React.SetStateAction<boolean | null>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  auth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ========================================
// Context
// ========================================
const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      const res = await api.post("/api/auth/refresh/");

      if (res.status === 200) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch {
      setIsAuthorized(false);
    }
  }, []);

  const auth = useCallback(async () => {
    try {
      // CSRFトークンを初期化
      await initializeCsrf();

      // 認証状態をサーバーに確認
      const res = await api.get("/api/auth/status/");

      if (res.status === 200 && res.data.authenticated) {
        setIsAuthorized(true);
        setUser(res.data.user);
      } else {
        setIsAuthorized(false);
      }
    } catch {
      // 401エラーの場合、トークンリフレッシュを試行
      try {
        await refreshToken();
        // リフレッシュ成功後、再度認証状態を確認
        const res = await api.get("/api/auth/status/");
        if (res.status === 200 && res.data.authenticated) {
          setIsAuthorized(true);
          setUser(res.data.user);
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      }
    }
  }, [refreshToken]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch {
      // ログアウトリクエストが失敗しても、ローカル状態はクリア
    }
    setIsAuthorized(false);
    setUser(null);
  }, []);

  useEffect(() => {
    void auth().catch(() => setIsAuthorized(false));
  }, [auth]);

  return (
    <AuthContext.Provider
      value={{
        isAuthorized,
        setIsAuthorized,
        user,
        setUser,
        auth,
        refreshToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
