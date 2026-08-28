import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function WorkspaceSettingsScreen() {
  return (
    <FeatureDetailScreen
      title="Workspace Settings"
      categoryName="Administration & Security"
      sharedSlice="workspaceSlice.js"
      permission="workspaces:read"
      iconName="Settings"
      iconColor="#03A9F4"
      description="Update community profile details, emergency contact numbers, branding logo, and workspace preferences."
    />
  );
}
