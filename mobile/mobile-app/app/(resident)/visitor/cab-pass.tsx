import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function CabPassScreen() {
  return (
    <FeatureDetailScreen
      title="Cab & Auto Pre-Approval"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="Car"
      iconColor="#f59e0b"
      description="Pre-approve incoming Uber, Ola, or taxi vehicles for automatic gate barrier opening."
    />
  );
}
