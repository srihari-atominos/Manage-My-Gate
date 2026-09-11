import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function AppInviteIndexRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();

  useEffect(() => {
    const inviteToken = params.token;
    if (inviteToken) {
      router.replace({
        pathname: '/(auth)/accept-invite',
        params: { ...params, token: inviteToken },
      });
    } else {
      router.replace({
        pathname: '/(auth)/accept-invite',
        params: params,
      });
    }
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
