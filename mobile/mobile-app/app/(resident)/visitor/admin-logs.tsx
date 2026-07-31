import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AdminGateLogsScreen() {
  return (
    <FeatureDetailScreen
      title="Admin Gate Logs"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:admin"
      iconName="ShieldAlert"
      iconColor="#6366f1"
      description="View live gate entries, check-in timestamps, exit logs, and community entry security audits."
    />
  );
}
