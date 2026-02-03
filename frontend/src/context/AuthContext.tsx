import { jwtDecode } from "jwt-decode";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import api from "../api";
import { ACCESS_TOKEN, CURRENT_USER, REFRESH_TOKEN } from "../constants";
import type { JwtPayload, User } from "../types";

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

  useEffect(() => {
    void auth().catch(() => setIsAuthorized(false));

    const storedUser = localStorage.getItem(CURRENT_USER);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const refreshToken = async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN);

    try {
      const res = await api.post("/api/token/refresh/", {
        refresh: storedRefreshToken,
      });

      if (res.status === 200) {
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        setIsAuthorized(true);
      }
      // If the refresh token is expired
      else {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.log(error);
      setIsAuthorized(false);
    }
  };

  const auth = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);

    // If the user has not logged in yet
    if (!token) {
      setIsAuthorized(false);
      return;
    }

    const decoded = jwtDecode<JwtPayload>(token);
    const now = Date.now() / 1000;

    // If the access token expired
    if (decoded.exp < now) {
      await refreshToken();
    } else {
      setIsAuthorized(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthorized,
        setIsAuthorized,
        user,
        setUser,
        auth,
        refreshToken,
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
