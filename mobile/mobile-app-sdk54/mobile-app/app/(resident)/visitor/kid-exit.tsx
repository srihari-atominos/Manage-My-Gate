import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function KidExitScreen() {
  return (
    <FeatureDetailScreen
      title="Kid Exit Approval"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="Baby"
      iconColor="#f43f5e"
      noticeBadge="Parental Control Module"
      description="Grant parental gate exit permission and receive instant alerts when children exit the community gate."
    />
  );
}
