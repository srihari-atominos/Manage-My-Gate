import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user?.role) {
    const hasRole = allowedRoles.includes(user.role);
    if (!hasRole) {
      return <Redirect href="/(auth)/login" />;
    }
  }

  return <>{children}</>;
};

export default AuthGuard;
