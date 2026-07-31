import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function BillingDashboardScreen() {
  return (
    <FeatureDetailScreen
      title="Billing & Maintenance Dues"
      categoryName="Financial Suite & Billing"
      sharedSlice="billingSlice.js"
      permission="billing:dashboard"
      iconName="CreditCard"
      iconColor="#03A9F4"
      description="View monthly maintenance invoices, utility charges, online payment receipts, and payment history."
    />
  );
}
