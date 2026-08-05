import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function ActiveNoticeBoardScreen() {
  return (
    <FeatureDetailScreen
      title="Active Notice Board"
      categoryName="Notice Board & Polls"
      sharedSlice="noticeBoardSlice.js"
      permission="notices:active_board"
      iconName="BellRing"
      iconColor="#14b8a6"
      description="Community bulletin board for emergency alerts, general circulars, maintenance notices, and society news."
    />
  );
}
