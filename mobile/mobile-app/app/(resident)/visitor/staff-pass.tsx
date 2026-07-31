import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function StaffPassScreen() {
  return (
    <FeatureDetailScreen
      title="Visiting Help & Daily Staff"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="UserCheck"
      iconColor="#06b6d4"
      description="Manage daily attendance, entry notifications, and access passes for maids, cooks, and drivers."
    />
  );
}
