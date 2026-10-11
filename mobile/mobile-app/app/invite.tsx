import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { setPendingInviteToken, clearPendingInviteToken } from '@/src/features/auth/utils/inviteContext';

export default function InviteRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated, acceptInvitation } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const rawToken = (params.token || params.inviteToken || (params as any).invite_token) as string | undefined;

    if (rawToken) {
      setPendingInviteToken(rawToken);
    }

    if (isAuthenticated && rawToken && !isProcessing) {
      setIsProcessing(true);
      (async () => {
        try {
          await acceptInvitation(rawToken);
          clearPendingInviteToken();
        } catch (err) {
          console.warn('Failed to auto-accept invitation in invite redirect:', err);
        } finally {
          router.replace('/(resident)');
        }
      })();
      return;
    }

    if (isAuthenticated) {
      router.replace('/(resident)');
      return;
    }

    router.replace({
      pathname: '/(auth)/login',
      params: params,
    });
  }, [params, router, isAuthenticated, acceptInvitation, isProcessing]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8EF' }}>
      <AppLoader variant="block" />
    </View>
  );
}
