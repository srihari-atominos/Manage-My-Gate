import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AmenitySecurityLogsScreen() {
  return (
    <FeatureDetailScreen
      title="Security Audit Logs"
      categoryName="Amenities & Facilities"
      sharedSlice="amenitiesSlice.js"
      permission="amenities:security_logs"
      iconName="ClipboardList"
      iconColor="#64748b"
      description="Audit trail of resident and guest check-ins, unauthorized entry attempts, and facility access security logs."
    />
  );
}
