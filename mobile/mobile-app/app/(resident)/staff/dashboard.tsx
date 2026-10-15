import React from 'react';
import { Stack } from 'expo-router';
import StaffDashboardScreen from '@/src/features/staff/screens/StaffDashboardScreen';

export default function StaffDashboardRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StaffDashboardScreen />
    </>
  );
}
