import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function GateConsoleScreen() {
  return (
    <FeatureDetailScreen
      title="Gate Security Console"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:guard"
      iconName="ScanLine"
      iconColor="#10b981"
      noticeBadge="Guard Domain"
      description="Security Guard check-in console for QR code scanning, manual visitor verification, and walk-in logs."
    />
  );
}
