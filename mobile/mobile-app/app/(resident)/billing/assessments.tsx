import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AssessmentManagerScreen() {
  return (
    <FeatureDetailScreen
      title="Assessment Manager"
      categoryName="Financial Suite & Billing"
      sharedSlice="billingSlice.js"
      permission="billing:assessment_manager"
      iconName="Calculator"
      iconColor="#10b981"
      description="Manage special community levies, batch invoice generation, late fee rule engine, and assessment schedules."
    />
  );
}
