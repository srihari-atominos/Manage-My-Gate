import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useAuth } from '../hooks/useAuth.js';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: string | string[];
  requirePlatform?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermission,
  requirePlatform = false,
}) => {
  const { checkPermission } = useAuth();
  const isPlatform = useSelector((state: any) => state.workspace?.isPlatform || false);

  if (requirePlatform && !isPlatform) {
    return <Navigate to="/403" replace />;
  }

  if (requiredPermission) {
    if (Array.isArray(requiredPermission)) {
      const hasPerm = isPlatform || requiredPermission.some((perm) => checkPermission(perm));
      if (!hasPerm) return <Navigate to="/403" replace />;
    } else {
      const hasPerm = isPlatform || checkPermission(requiredPermission);
      if (!hasPerm) return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;
