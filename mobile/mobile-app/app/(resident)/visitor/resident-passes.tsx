import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function ResidentPassesScreen() {
  return (
    <FeatureDetailScreen
      title="Resident Visitor Passes"
      categoryName="Visitor & Gate Security"
      sharedSlice="visitorSlice.js"
      permission="visitor:resident"
      iconName="QrCode"
      iconColor="#03A9F4"
      description="Create instant QR visitor passes, pre-approve guests, and send invitations directly to visitors."
    />
  );
}
