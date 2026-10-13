import React from 'react';
import { Stack } from 'expo-router';
import StaffDirectoryScreen from '@/src/features/staff/screens/StaffDirectoryScreen';

export default function StaffDirectoryRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StaffDirectoryScreen />
    </>
  );
}
