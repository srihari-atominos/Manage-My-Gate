import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';
import { useRouter } from 'expo-router';

export default function StaffPassScreen() {
  const router = useRouter();

  return (
    <FeatureDetailScreen
      title="Visiting Help & Daily Staff"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="UserCheck"
      iconColor="#06b6d4"
      description="Manage daily attendance, entry notifications, and access passes for maids, cooks, and drivers."
      actionButton={{
        label: 'Create Staff Pass',
        onPress: () => router.push({ pathname: '/(resident)/visitor/invite' as any, params: { type: 'SERVICE' } }),
      }}
    />
  );
}
