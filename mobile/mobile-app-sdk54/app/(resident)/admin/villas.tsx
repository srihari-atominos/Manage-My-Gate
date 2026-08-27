import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function VillaManagementScreen() {
  return (
    <FeatureDetailScreen
      title="Unit & Villa Management"
      categoryName="Administration & Security"
      sharedSlice="workspaceSlice.js"
      permission="villas:read"
      iconName="Home"
      iconColor="#14b8a6"
      description="Configure community blocks, villa numbers, owner/tenant mapping, and parking space allocations."
    />
  );
}
