import React from 'react';
import { Stack } from 'expo-router';
import ResidentStaffScreen from '@/src/features/staff/screens/ResidentStaffScreen';

export default function MyStaffRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ResidentStaffScreen />
    </>
  );
}
