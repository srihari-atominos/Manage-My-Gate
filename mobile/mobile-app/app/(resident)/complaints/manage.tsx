import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function ComplaintManagementScreen() {
  return (
    <FeatureDetailScreen
      title="Complaint Management Queue"
      categoryName="Complaints & Maintenance"
      sharedSlice="complaintSlice.js"
      permission="complaints:complaint_management"
      iconName="Kanban"
      iconColor="#6366f1"
      description="Admin ticket queue board for assigning staff, updating ticket priorities, tracking resolution SLA, and closing tickets."
    />
  );
}
