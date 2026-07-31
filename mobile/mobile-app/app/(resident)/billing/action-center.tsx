import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function ActionCenterScreen() {
  return (
    <FeatureDetailScreen
      title="Action & Dispute Center"
      categoryName="Financial Suite & Billing"
      sharedSlice="billingSlice.js"
      permission="billing:action_center"
      iconName="FileText"
      iconColor="#3b82f6"
      description="Download official payment tax receipts, submit invoice dispute requests, and manage payment methods."
    />
  );
}
