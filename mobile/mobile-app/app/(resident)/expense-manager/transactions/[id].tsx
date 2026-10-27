import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TransactionDetailsScreen, TransactionEditScreen } from '@/src/features/personalExpense';

export default function TransactionRoute() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();

  if (edit === '1') {
    return <TransactionEditScreen onDone={() => router.setParams({ edit: '' })} />;
  }

  return <TransactionDetailsScreen />;
}
