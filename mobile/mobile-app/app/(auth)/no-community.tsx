import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import * as React from 'react';
import { View, ImageBackground, Platform } from 'react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useTranslation } from '@/src/utils/i18n';

/** Signed in, but the account has no community yet (access is by invitation only). */
export default function NoCommunityScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth() as any;

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require('../../assets/images/auth-bg.jpg')}
        style={{ flex: 1 }}
        blurRadius={Platform.OS === 'ios' ? 3 : 2}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-white/40 dark:bg-[#0B0E14]/55" />
        <View className="flex-1 justify-center p-6">
          <View className="max-w-sm mx-auto w-full bg-white/80 dark:bg-[#1C1917]/80 border border-white/70 dark:border-white/15 rounded-3xl p-6 gap-4 items-center">
            <View className="bg-primary/10 p-4 rounded-full">
              <Building2 size={28} className="text-primary" />
            </View>
            <Text className="text-xl font-extrabold text-foreground text-center">
              {t('not_in_community_yet', "You're not part of a community yet")}
            </Text>
            <Text className="text-sm text-muted-foreground text-center">
              {t('not_in_community_help', 'Ask your community admin to invite you. When they do, open the invitation link or check your invitations here.')}
            </Text>
            <Button testID="no-community-check-invitations" className="w-full h-11" onPress={() => router.push('/(auth)/pending-invitations' as any)}>
              <Text className="font-bold text-primary-foreground">{t('check_invitations', 'Check my invitations')}</Text>
            </Button>
            <Button variant="ghost" className="h-10" onPress={signOut}>
              <Text className="text-primary text-sm font-semibold">{t('sign_out', 'Sign out')}</Text>
            </Button>
          </View>
        </View>
      </ImageBackground>
    </>
  );
}
