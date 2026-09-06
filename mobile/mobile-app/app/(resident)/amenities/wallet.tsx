import React from 'react';
import { Stack } from 'expo-router';
import WalletScreen from '@/src/features/billing/screens/WalletScreen';

export default function AmenityWalletRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WalletScreen />
    </>
  );
}
