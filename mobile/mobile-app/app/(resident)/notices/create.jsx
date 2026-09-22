import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import CreateEditNoticeScreen from '@/src/features/noticeBoard/screens/CreateEditNoticeScreen';
import CommunityEngagementWizardScreen from '@/src/features/communityEngagement/screens/CommunityEngagementWizardScreen';

export default function CreateNoticeRoute() {
  const { id } = useLocalSearchParams();

  // If editing an existing notice by ID, render the dedicated edit screen
  if (id) {
    return <CreateEditNoticeScreen />;
  }

  // Unified Mobile Creation Wizard for new Community Engagement notices
  return <CommunityEngagementWizardScreen />;
}
