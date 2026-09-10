import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function UniversalInviteTokenRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  useEffect(() => {
    const inviteToken = params.token;
    if (inviteToken) {
      router.replace({
        pathname: '/(auth)/accept-invite',
        params: { token: inviteToken },
      });
    } else {
      router.replace('/(auth)/accept-invite');
    }
  }, [params.token, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
