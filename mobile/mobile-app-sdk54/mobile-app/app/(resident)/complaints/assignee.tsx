import React from 'react';
import { Stack } from 'expo-router';
import StaffAssigneeQueueScreen from '@/src/features/complaints/screens/StaffAssigneeQueueScreen';

export default function AssigneeQueueRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StaffAssigneeQueueScreen />
    </>
  );
}
