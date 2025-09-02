
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'admin' | 'hod';
  requiredRoles?: ('student' | 'admin' | 'hod')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, requiredRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check single role or multiple roles
  const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role as any)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
