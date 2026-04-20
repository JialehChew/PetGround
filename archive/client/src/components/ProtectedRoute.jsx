import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  // prevents unauthorized redirection before resolving auth
  if (loading) {
    return <div>Loading...</div>;
  };
  // redirect to login if not auth
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />; // replace does not create new entry in browser history on redirection
  };
  // if rbac enabled annd user.role exits in allowedRoles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  };
  // if authenticated and right role, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
