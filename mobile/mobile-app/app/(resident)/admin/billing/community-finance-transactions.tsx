import React from 'react';
import { Stack } from 'expo-router';
import CommunityFinanceTransactionsScreen from '@/src/features/communityFinance/screens/CommunityFinanceTransactionsScreen';

export default function CommunityFinanceTransactionsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommunityFinanceTransactionsScreen />
    </>
  );
}
