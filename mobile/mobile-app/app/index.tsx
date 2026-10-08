import React from 'react';
import { AppLoader } from '@/components/ui/AppLoader';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/hooks/useAuth';
import { resolveHomeRoute } from '../src/features/auth/utils/landing';

export default function IndexScreen() {
  const { isAuthenticated, isInitialized, user } = useAuth();

  // Show a neutral themed loading spinner until auth state bootstrapping finishes
  if (!isInitialized) {
    return <AppLoader variant="fullscreen" />;
  }

  if (isAuthenticated) {
    // First screen comes from the server's permission-based `landing` hint
    return <Redirect href={resolveHomeRoute(user) as any} />;
  }

  // Unauthenticated users land directly on the Nahom Login screen
  return <Redirect href="/(auth)/login" />;
}
