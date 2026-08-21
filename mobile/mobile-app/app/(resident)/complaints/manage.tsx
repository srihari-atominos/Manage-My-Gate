import React from 'react';
import { Stack } from 'expo-router';
import AdminComplaintManagementScreen from '@/src/features/complaints/screens/AdminComplaintManagementScreen';

export default function ManageTicketsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminComplaintManagementScreen />
    </>
  );
}
