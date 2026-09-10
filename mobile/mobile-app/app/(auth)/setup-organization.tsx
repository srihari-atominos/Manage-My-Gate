import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { CreateOrganizationScreen } from '../../src/features/organization';

export default function SetupOrganizationRoute() {
  const params = useLocalSearchParams<{ intent?: string; canGoBack?: string }>();
  const showCancel = params?.intent === 'create-org' || params?.canGoBack === 'true';

  return <CreateOrganizationScreen showCancel={showCancel} />;
}
