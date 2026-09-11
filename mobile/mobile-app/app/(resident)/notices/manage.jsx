import React from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';

import ManageNoticesScreen from '@/src/features/noticeBoard/screens/ManageNoticesScreen';

export default function ManageNoticesRoute() {
  const { user } = useSelector((state) => state.auth || {});
  const userPermissions = user?.permissions || [];
  const userRole = user?.role || '';
  const isAdminRole = [
    'Admin',
    'Community Admin',
    'Super Admin',
    'Platform Super Admin',
    'SuperAdmin',
  ].includes(userRole);

  const hasManagePermission =
    isAdminRole ||
    userPermissions.includes('notices.manage_notices') ||
    userPermissions.includes('notices:manage_notices') ||
    userPermissions.includes('notices:manage') ||
    userPermissions.includes('notices.create') ||
    userPermissions.includes('notices:create') ||
    userPermissions.includes('notices.dashboard') ||
    userPermissions.includes('notices:dashboard');

  if (!hasManagePermission) {
    return <Redirect href="/(resident)/notices" />;
  }

  return <ManageNoticesScreen />;
}
