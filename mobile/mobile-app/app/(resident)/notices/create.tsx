import React from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import CreateEditNoticeScreen from '@/src/features/noticeBoard/screens/CreateEditNoticeScreen';

export default function CreateNoticeRoute() {
  const { user } = useSelector((state: any) => state.auth || {});
  const userPermissions = user?.permissions || [];
  const hasManagePermission =
    userPermissions.includes('notices.manage_notices') ||
    userPermissions.includes('notices:manage_notices') ||
    user?.role === 'Admin' ||
    user?.role === 'SuperAdmin';

  if (!hasManagePermission) {
    return <Redirect href="/(resident)/notices" />;
  }

  return <CreateEditNoticeScreen />;
}
