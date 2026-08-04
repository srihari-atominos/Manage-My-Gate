import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';
import { useRouter } from 'expo-router';

export default function CabPassScreen() {
  const router = useRouter();

  return (
    <FeatureDetailScreen
      title="Cab & Auto Pre-Approval"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="Car"
      iconColor="#f59e0b"
      description="Pre-approve incoming Uber, Ola, or taxi vehicles for automatic gate barrier opening."
      actionButton={{
        label: 'Create Cab Pass',
        onPress: () => router.push({ pathname: '/(resident)/visitor/invite' as any, params: { type: 'CAB' } }),
      }}
    />
  );
}
