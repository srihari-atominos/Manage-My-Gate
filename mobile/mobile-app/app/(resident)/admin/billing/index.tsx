import React from 'react';
import { Stack } from 'expo-router';
import AdminBillingDashboardScreen from '@/src/features/billing/screens/AdminBillingDashboardScreen';

export default function AdminBillingIndexRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminBillingDashboardScreen />
    </>
  );
}
