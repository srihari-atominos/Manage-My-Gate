import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator, Linking } from 'react-native';

export default function AppInviteTokenRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();

  useEffect(() => {
    const inviteToken = params.token;
    if (inviteToken) {
      Linking.openURL(`https://managemygate.e3esg.com/invite/${inviteToken}`).catch(() => {});
      router.replace('/(auth)/login');
    } else {
      router.replace('/(auth)/login');
    }
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}
