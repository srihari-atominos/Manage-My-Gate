import React from 'react';
import { Stack } from 'expo-router';

export default function CommunityEngagementLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ledger" />
      <Stack.Screen name="create" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
