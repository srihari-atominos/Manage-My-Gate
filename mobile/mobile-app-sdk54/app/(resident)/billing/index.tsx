import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';

export default function BillingEntryGatewayRoute() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth?.user);

  useEffect(() => {
    if (!user) return;

    const permissions = user.permissions || [];
    const userRole = (user.role || '').toLowerCase();
    const hasAdminDashboardAccess =
      permissions.includes('billing:dashboard') ||
      permissions.includes('billing:assessment_manager') ||
      userRole === 'admin' ||
      userRole === 'accountant' ||
      userRole === 'treasury';

    if (hasAdminDashboardAccess) {
      router.replace('/(resident)/admin/billing' as any);
    } else {
      router.replace('/(resident)/billing/my-dues' as any);
    }
  }, [user, router]);

  return (
    <View className="flex-1 justify-center items-center bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
