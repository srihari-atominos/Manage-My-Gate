import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function NoticeDashboardScreen() {
  return (
    <FeatureDetailScreen
      title="Notice Analytics Dashboard"
      categoryName="Notice Board & Polls"
      sharedSlice="noticeBoardSlice.js"
      permission="notices:dashboard"
      iconName="LayoutDashboard"
      iconColor="#6366f1"
      description="Notice delivery analytics, read receipt engagement metrics, and community broadcast reach reports."
    />
  );
}
