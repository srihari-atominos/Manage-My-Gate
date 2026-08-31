import React from 'react';
import { Stack } from 'expo-router';
import PollDetailScreen from '@/src/features/poll/screens/PollDetailScreen';

export default function PollDetailRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PollDetailScreen />
    </>
  );
}
