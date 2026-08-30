import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute wrapper component
 * - Displays a loading spinner while session validation is underway (on initial load / refresh)
 * - Redirects unauthenticated users to /login and saves current route for redirect after login
 * - Renders protected child components when authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-600">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, remembering the route they tried to visit
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
