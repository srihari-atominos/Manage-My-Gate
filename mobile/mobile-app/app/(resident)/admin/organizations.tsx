import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function OrganizationManagerScreen() {
  return (
    <FeatureDetailScreen
      title="Organization Manager"
      categoryName="Administration & Security"
      sharedSlice="organizationSlice.js"
      permission="platform:super_admin"
      iconName="Building"
      iconColor="#a855f7"
      description="Super Admin multi-community management portal for onboarding new gated societies, managing plans, and platform stats."
    />
  );
}
