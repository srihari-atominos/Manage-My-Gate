import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function MyTicketsScreen() {
  return (
    <FeatureDetailScreen
      title="Track My Tickets"
      categoryName="Complaints & Maintenance"
      sharedSlice="complaintSlice.js"
      permission="complaints:track_requests"
      iconName="ListOrdered"
      iconColor="#03A9F4"
      description="Track live status of your reported tickets, communicate with assigned technicians, and rate completed resolutions."
    />
  );
}
