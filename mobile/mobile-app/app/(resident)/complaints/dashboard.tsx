import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function ComplaintsDashboardScreen() {
  return (
    <FeatureDetailScreen
      title="Complaints Dashboard"
      categoryName="Complaints & Maintenance"
      sharedSlice="complaintSlice.js"
      permission="complaints:dashboard"
      iconName="BarChart3"
      iconColor="#a855f7"
      description="Executive metrics, ticket resolution SLA performance, category breakdown, and maintenance satisfaction analytics."
    />
  );
}
