import { useCallback, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ProtectedRoutes() {
  const { isAuthorized, setIsAuthorized, auth } = useAuth();

  const checkAuth = useCallback(() => {
    auth().catch(() => setIsAuthorized(false));
  }, [auth, setIsAuthorized]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthorized === null) {
    return <div>Loading...</div>;
  }

  return isAuthorized ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoutes;
