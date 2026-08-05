import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function IntegrationHubScreen() {
  return (
    <FeatureDetailScreen
      title="Integration Hub"
      categoryName="Administration & Security"
      sharedSlice="workspaceSlice.js"
      permission="integrations:read"
      iconName="Layers"
      iconColor="#f59e0b"
      description="Connect third-party IoT boom barrier hardware, RFID vehicle tags, payment gateways, and SMS alert APIs."
    />
  );
}
