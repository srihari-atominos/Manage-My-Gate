import React from 'react';
import { Stack } from 'expo-router';
import PublicVisitorPassScreen from '@/src/features/visitor/screens/PublicVisitorPassScreen';

export default function PublicVisitorPassRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PublicVisitorPassScreen />
    </>
  );
}
