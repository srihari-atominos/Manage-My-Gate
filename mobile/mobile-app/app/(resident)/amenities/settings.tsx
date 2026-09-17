import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { FeatureDetailScreen } from '@/components/dashboard/FeatureDetailScreen';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';

export default function AmenitySettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  if (user && !isFeatureAllowedForUser({ id: 'amenities_settings', permission: 'amenities:settings' }, user)) {
    return <Redirect href="/(resident)/dashboard" />;
  }

  return (
    <FeatureDetailScreen
      title="Amenity Settings"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:settings"
      iconName="SlidersHorizontal"
      iconColor="#6366F1"
      description="Configure advance booking windows, auto-cancellation timers, refund percentage rules, and guest limit policies."
      actionButton={{
        label: 'Manage Rate Cards & Slots in Master',
        onPress: () => router.push('/(resident)/amenities/admin-master' as any),
      }}
    />
  );
}
