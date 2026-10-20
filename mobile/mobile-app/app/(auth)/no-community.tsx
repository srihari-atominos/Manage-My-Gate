import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import * as React from 'react';
import { View, ImageBackground, Platform, Alert } from 'react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useTranslation } from '@/src/utils/i18n';

/** Signed in, but the account has no community yet (access is by invitation only). */
export default function NoCommunityScreen() {
  const { t } = useTranslation();
  const { logout, deleteAccount } = useAuth() as any;
  const [isDeleting, setIsDeleting] = React.useState(false);

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // Accounts can be created here by signing in (e.g. with Apple), so deleting one must be possible
  // before the person has joined any community; Settings is not reachable from this screen.
  const runDelete = async () => {
    try {
      setIsDeleting(true);
      const result: any = await deleteAccount();
      if (result?.meta?.requestStatus === 'rejected') {
        const msg = String(result?.payload || t('delete_account_failed', 'Failed to delete account. Please try again.'));
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert(t('error', 'Error'), msg);
        return;
      }
      router.replace('/(auth)/login');
    } catch (e: any) {
      const msg = e?.message || t('delete_account_failed', 'Failed to delete account. Please try again.');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('error', 'Error'), msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    const title = t('confirm_delete_account_title', 'Delete Account?');
    const message = t('confirm_delete_account_message', 'Are you sure you want to delete your account? This action cannot be undone.');
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void runDelete();
      return;
    }
    Alert.alert(title, message, [
      { text: t('cancel', 'Cancel'), style: 'cancel' },
      { text: t('delete', 'Delete'), style: 'destructive', onPress: () => void runDelete() },
    ]);
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
              {t('not_in_community_help', 'Ask your community admin to invite you. When they do, click the invitation link to join.')}
            </Text>
            <Button variant="ghost" className="h-10" onPress={signOut}>
              <Text className="text-primary text-sm font-semibold">{t('sign_out', 'Sign out')}</Text>
            </Button>
            <Button variant="ghost" className="h-10" onPress={confirmDelete} disabled={isDeleting}>
              <Text className="text-destructive text-sm font-semibold">
                {isDeleting ? t('deleting', 'Deleting...') : t('delete_account', 'Delete account')}
              </Text>
            </Button>
          </View>
        </View>
      </ImageBackground>
    </>
  );
}
