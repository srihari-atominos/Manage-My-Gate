import React from 'react';
import { Stack } from 'expo-router';
import ResidentMyTicketsScreen from '@/src/features/complaints/screens/ResidentMyTicketsScreen';

export default function MyTicketsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ResidentMyTicketsScreen />
    </>
  );
}
