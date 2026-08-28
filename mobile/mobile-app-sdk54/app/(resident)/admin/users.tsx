import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function UserManagementScreen() {
  return (
    <FeatureDetailScreen
      title="User Management"
      categoryName="Administration & Security"
      sharedSlice="userSlice.js"
      permission="users:read"
      iconName="Users"
      iconColor="#6366f1"
      description="Manage community user accounts, invite residents, assign security guards, and toggle account activations."
    />
  );
}
