import React from 'react';
import { Stack } from 'expo-router';
import InvoiceDetailsScreen from '@/src/features/billing/screens/InvoiceDetailsScreen';

export default function InvoiceDetailsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <InvoiceDetailsScreen />
    </>
  );
}
