import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ProtectedRoutes() {
  const { isAuthorized, setIsAuthorized, auth } = useAuth();

  useEffect(() => {
    auth().catch(() => setIsAuthorized(false));
  }, []);

  if (isAuthorized == null) {
    return <div>Loading...</div>;
  }

  return isAuthorized ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoutes;
