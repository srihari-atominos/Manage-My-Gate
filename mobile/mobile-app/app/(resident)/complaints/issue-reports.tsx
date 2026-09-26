import React from 'react';
import { Stack } from 'expo-router';
import { CommunityIssueReportsScreen } from '@/src/features/issueReport';

export default function CommunityIssueReportsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommunityIssueReportsScreen />
    </>
  );
}
