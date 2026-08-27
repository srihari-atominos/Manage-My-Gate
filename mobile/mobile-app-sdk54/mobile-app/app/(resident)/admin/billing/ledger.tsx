import React from 'react';
import { Stack } from 'expo-router';
import BillingLedgerScreen from '@/src/features/billing/screens/BillingLedgerScreen';

export default function AdminBillingLedgerRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BillingLedgerScreen />
    </>
  );
}
