import React from 'react';
import { Stack } from 'expo-router';
import { PaymentResultScreen } from '@/src/features/billing';

export default function PaymentResultRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PaymentResultScreen />
    </>
  );
}
