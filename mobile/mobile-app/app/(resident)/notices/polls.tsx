import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function CommunityPollsScreen() {
  return (
    <FeatureDetailScreen
      title="Community Polls & Surveys"
      categoryName="Notice Board & Polls"
      sharedSlice="pollSlice.js"
      permission="notices:polls"
      iconName="Vote"
      iconColor="#a855f7"
      description="Participate in community decision voting, view live poll results, and express your opinion on society initiatives."
    />
  );
}
