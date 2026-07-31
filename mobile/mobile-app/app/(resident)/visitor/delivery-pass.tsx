import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function DeliveryPassScreen() {
  return (
    <FeatureDetailScreen
      title="Allow Delivery"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="PackageCheck"
      iconColor="#a855f7"
      description="Pre-approve courier, food, or grocery deliveries for seamless entry without guard intercom delays."
    />
  );
}
