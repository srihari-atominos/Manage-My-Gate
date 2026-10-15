import React from 'react';
import { Stack } from 'expo-router';
import StaffAttendanceScreen from '@/src/features/staff/screens/StaffAttendanceScreen';

export default function StaffAttendanceRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StaffAttendanceScreen />
    </>
  );
}
