import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function StaffAndVendorsScreen() {
  return (
    <FeatureDetailScreen
      title="Staff & Vendor Roster"
      categoryName="Complaints & Maintenance"
      sharedSlice="complaintSlice.js"
      permission="complaints:staff"
      iconName="Users2"
      iconColor="#14b8a6"
      description="Roster of internal electricians, plumbers, HVAC technicians, and external third-party maintenance vendor contacts."
    />
  );
}
