import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function RaiseTicketScreen() {
  return (
    <FeatureDetailScreen
      title="Raise Maintenance Ticket"
      categoryName="Complaints & Maintenance"
      sharedSlice="complaintSlice.js"
      permission="complaints:raise_ticket"
      iconName="PlusCircle"
      iconColor="#f43f5e"
      description="Submit a new plumbing, electrical, carpentry, or common area maintenance issue with photos and urgency level."
    />
  );
}
