import React from 'react';
import CommunityEngagementWizardScreen from '@/src/features/communityEngagement/screens/CommunityEngagementWizardScreen';

export default function CreateNoticeRoute() {
  // Always render the unified 5-step Community Engagement Wizard for both create and edit
  return <CommunityEngagementWizardScreen />;
}

