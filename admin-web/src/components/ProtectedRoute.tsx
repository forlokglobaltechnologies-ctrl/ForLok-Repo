import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../lib/permissions';
import type { ReactElement } from 'react';

type ProtectedRouteProps = {
  children: ReactElement;
  permission?: string | string[];
};

export default function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const location = useLocation();
  const { isLoading, isAuthenticated, admin } = useAuth();

  if (isLoading) {
    return <div className="fullscreen-loader">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (permission && !hasPermission(admin?.role, admin?.permissions, permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
