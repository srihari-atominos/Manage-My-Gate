import React from 'react';
import { Stack } from 'expo-router';
import AssessmentManagementScreen from '@/src/features/billing/screens/AssessmentManagementScreen';

export default function FinanceAssessmentsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AssessmentManagementScreen />
    </>
  );
}
