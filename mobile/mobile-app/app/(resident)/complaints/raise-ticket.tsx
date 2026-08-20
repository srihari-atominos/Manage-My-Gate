import React from 'react';
import { Stack } from 'expo-router';
import ResidentRaiseTicketScreen from '@/src/features/complaints/screens/ResidentRaiseTicketScreen';

export default function RaiseTicketRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ResidentRaiseTicketScreen />
    </>
  );
}
