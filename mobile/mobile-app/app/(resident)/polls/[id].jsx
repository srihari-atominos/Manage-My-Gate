import React from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { checkIsAdmin } from '@/src/utils/rbac';
import PollDetailScreen from '../../../src/features/poll/screens/PollDetailScreen';

export default function PollDetailRoute() {
  const { user } = useSelector((state) => state.auth || {});
  const isCommunityAdmin = checkIsAdmin(user);

  if (!isCommunityAdmin) {
    return <Redirect href="/(resident)/polls" />;
  }

  return <PollDetailScreen />;
}
