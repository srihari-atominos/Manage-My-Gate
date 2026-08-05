import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function ManageNoticesScreen() {
  return (
    <FeatureDetailScreen
      title="Manage Notices & Circulars"
      categoryName="Notice Board & Polls"
      sharedSlice="noticeBoardSlice.js"
      permission="notices:manage_notices"
      iconName="FileEdit"
      iconColor="#03A9F4"
      description="Admin notice publishing, draft editor, scheduled announcements, attachment uploads, and notice pinning."
    />
  );
}
