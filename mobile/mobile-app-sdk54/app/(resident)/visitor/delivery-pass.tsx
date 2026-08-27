import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';
import { useRouter } from 'expo-router';

export default function DeliveryPassScreen() {
  const router = useRouter();

  return (
    <FeatureDetailScreen
      title="Allow Delivery"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="PackageCheck"
      iconColor="#a855f7"
      description="Pre-approve courier, food, or grocery deliveries for seamless entry without guard intercom delays."
      actionButton={{
        label: 'Create Delivery Pass',
        onPress: () => router.push({ pathname: '/(resident)/visitor/invite' as any, params: { type: 'DELIVERY' } }),
      }}
    />
  );
}
