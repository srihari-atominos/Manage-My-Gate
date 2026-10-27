import React from 'react';
import { Stack } from 'expo-router';
import CommunityFinanceDashboardScreen from '@/src/features/communityFinance/screens/CommunityFinanceDashboardScreen';

export default function CommunityFinanceRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommunityFinanceDashboardScreen />
    </>
  );
}
