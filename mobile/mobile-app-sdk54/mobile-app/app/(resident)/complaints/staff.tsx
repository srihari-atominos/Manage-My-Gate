import React from 'react';
import { Stack } from 'expo-router';
import StaffVendorDirectoryScreen from '@/src/features/complaints/screens/StaffVendorDirectoryScreen';

export default function StaffDirectoryRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StaffVendorDirectoryScreen />
    </>
  );
}
