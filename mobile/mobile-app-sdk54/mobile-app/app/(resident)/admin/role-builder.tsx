import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function RoleBuilderScreen() {
  return (
    <FeatureDetailScreen
      title="Role Builder & RBAC"
      categoryName="Administration & Security"
      sharedSlice="roleSlice.js"
      permission="roles:read"
      iconName="ShieldCheck"
      iconColor="#f43f5e"
      description="Create custom security roles, configure granular feature access permissions, and assign matrices."
    />
  );
}
