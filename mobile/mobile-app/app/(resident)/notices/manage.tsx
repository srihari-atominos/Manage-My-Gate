import React from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import ManageNoticesScreen from '@/src/features/noticeBoard/screens/ManageNoticesScreen';

export default function ManageNoticesRoute() {
  const { user } = useSelector((state: RootState) => (state as any).auth || {});
  const userPermissions = user?.permissions || [];
  const hasManagePermission =
    userPermissions.includes('notices.manage_notices') ||
    userPermissions.includes('notices:manage_notices') ||
    userPermissions.includes('notices:manage') ||
    user?.role === 'Admin' ||
    user?.role === 'SuperAdmin';

  if (!hasManagePermission) {
    return <Redirect href="/(resident)/notices" />;
  }

  return <ManageNoticesScreen />;
}
