import React from 'react';
import { Stack } from 'expo-router';
import ResidentMyDuesScreen from '@/src/features/billing/screens/ResidentMyDuesScreen';

export default function ResidentMyDuesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ResidentMyDuesScreen />
    </>
  );
}

