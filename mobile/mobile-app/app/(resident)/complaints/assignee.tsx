import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AssigneeConsoleScreen() {
  return (
    <FeatureDetailScreen
      title="Assignee Work Console"
      categoryName="Complaints & Maintenance"
      sharedSlice="complaintSlice.js"
      permission="complaints:assignee"
      iconName="UserCheck"
      iconColor="#10b981"
      description="Technician work order console displaying assigned repair tasks, location details, and resolution sign-offs."
    />
  );
}
