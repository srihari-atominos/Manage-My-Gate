import React from 'react';
import { Stack } from 'expo-router';
import ComplaintDashboardScreen from '@/src/features/complaints/screens/ComplaintDashboardScreen';

export default function DashboardRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ComplaintDashboardScreen />
    </>
  );
}
