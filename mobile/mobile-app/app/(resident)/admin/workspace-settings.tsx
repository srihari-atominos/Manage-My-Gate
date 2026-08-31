import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { WorkspaceModulesForm } from '@/src/features/workspace/components/WorkspaceModulesForm';

import { ALL_AVAILABLE_FEATURES } from '@/components/dashboard/CustomiseSheetModal';
import ActionTile from '@/components/dashboard/ActionTile';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

export default function WorkspaceSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // RBAC Permission Check Helper
  const userPermissions: string[] = user?.permissions || [];
  const userRoleName = user?.role || (user as any)?.activeRole || (Array.isArray((user as any)?.roles) ? (typeof (user as any).roles[0] === 'string' ? (user as any).roles[0] : (user as any).roles[0]?.name) : '');
  const isSuperAdmin = Boolean(
    userPermissions.includes('platform:super_admin') ||
    userRoleName === 'Platform Super Admin' ||
    userRoleName === 'SuperAdmin' ||
    userRoleName === 'Community Admin' ||
    user?.isPlatform === true
  );

  const adminFeatures = ALL_AVAILABLE_FEATURES.filter(
    (f) => f.categoryKey === 'administration_security' && (isSuperAdmin || !f.permission || userPermissions.includes(f.permission))
  );

  const handleTileClick = (feature: any) => {
    if (feature && feature.route) {
      router.push(feature.route as any);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Workspace Settings' }} />
      <ScreenShell scrollable>
        <View className="px-4 py-4 gap-8">
          <WorkspaceModulesForm />
        </View>
      </ScreenShell>
    </>
  );
}
