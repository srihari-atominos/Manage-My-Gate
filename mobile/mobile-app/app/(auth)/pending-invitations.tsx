import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import { Building2, Check, X } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, ActivityIndicator, ImageBackground, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import authService from '../../src/features/auth/services/authService';
import { clearInvitationSelection } from '../../src/features/auth/store/authSlice';
import { clearPendingInviteToken } from '@/src/features/auth/utils/inviteContext';
import { useTranslation } from '@/src/utils/i18n';

interface PendingInvitation {
  id: string;
  orgId: string;
  communityName: string;
  roleName?: string | null;
  unitLabel?: string | null;
  expiresAt?: string;
}

/**
 * Lists the invitations addressed to the verified person and accepts exactly the one
 * they choose. Used when an invitee signs in without the invitation link (for example
 * after a fresh install), and by signed-in users invited to another community.
 */
export default function PendingInvitationsScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isAuthenticated, respondToInvitation, logout } = useAuth() as any;
  const selection = useSelector((state: any) => state.auth.invitationSelection);
  const [signedInList, setSignedInList] = React.useState<PendingInvitation[] | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const ticket: string | null = selection?.ticket || null;
  const invitations: PendingInvitation[] = isAuthenticated ? signedInList || [] : selection?.pendingInvitations || [];

  React.useEffect(() => {
    if (!isAuthenticated) return;
    authService
      .getPendingInvitations()
      .then((res: any) => setSignedInList(res?.data?.data || res?.data || []))
      .catch(() => setSignedInList([]));
  }, [isAuthenticated]);

  const respond = async (action: 'accept' | 'decline', invitation: PendingInvitation) => {
    setBusyId(invitation.id);
    setMessage(null);
    const result: any = await respondToInvitation({ action, invitationId: invitation.id, ticket });
    setBusyId(null);
    if (result?.meta?.requestStatus !== 'fulfilled') {
      setMessage(result?.payload?.message || t('invitation_update_failed', 'Could not update this invitation. Please try again.'));
      return;
    }
    if (action === 'accept') {
      clearPendingInviteToken();
      router.replace('/');
      return;
    }
    if (isAuthenticated) {
      setSignedInList((list) => (list || []).filter((i) => i.id !== invitation.id));
    }
  };

  const backToSignIn = async () => {
    dispatch(clearInvitationSelection());
    if (isAuthenticated) await logout();
    router.replace('/(auth)/login');
  };

  const loadingList = isAuthenticated && signedInList === null;

  return (
    <>
      <Stack.Screen options={{ title: t('your_invitations', 'Your Invitations'), headerShown: false }} />
      <ImageBackground
        source={require('../../assets/images/auth-bg.jpg')}
        style={{ flex: 1 }}
        blurRadius={Platform.OS === 'ios' ? 3 : 2}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-white/40 dark:bg-[#0B0E14]/55" />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
          <View className="gap-5 flex-1 justify-center max-w-sm mx-auto w-full">
            <View className="items-center gap-1.5">
              <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
                {t('choose_invitation', 'Choose your community')}
              </Text>
              <Text className="text-muted-foreground text-sm text-center px-2">
                {t('choose_invitation_help', 'You have been invited to the communities below. Accept the one you want to join now.')}
              </Text>
            </View>

            {message ? (
              <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <Text className="text-destructive text-xs text-center font-medium">{message}</Text>
              </View>
            ) : null}

            {loadingList ? (
              <ActivityIndicator />
            ) : invitations.length === 0 ? (
              <View className="bg-white/75 dark:bg-[#1C1917]/75 border border-white/70 dark:border-white/15 rounded-3xl p-5 gap-2">
                <Text className="text-foreground font-semibold text-center">
                  {t('no_pending_invitations', 'No pending invitations')}
                </Text>
                <Text className="text-muted-foreground text-xs text-center">
                  {t('no_pending_invitations_help', 'Ask your community admin to send you an invitation.')}
                </Text>
              </View>
            ) : (
              invitations.map((invitation) => (
                <View
                  key={invitation.id}
                  testID={`invitation-${invitation.orgId}`}
                  className="bg-white/80 dark:bg-[#1C1917]/80 border border-white/70 dark:border-white/15 rounded-3xl p-4 gap-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-primary/10 p-2.5 rounded-2xl">
                      <Building2 size={20} className="text-primary" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                        {invitation.communityName}
                      </Text>
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {[invitation.roleName, invitation.unitLabel].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2.5">
                    <Button
                      testID={`invitation-accept-${invitation.orgId}`}
                      className="flex-1 h-11"
                      disabled={!!busyId}
                      onPress={() => respond('accept', invitation)}
                    >
                      {busyId === invitation.id ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View className="flex-row items-center gap-1.5">
                          <Check size={16} color="#fff" />
                          <Text className="font-bold text-primary-foreground">{t('step_into_community', 'Step Into Your Community')}</Text>
                        </View>
                      )}
                    </Button>
                    <Button
                      testID={`invitation-decline-${invitation.orgId}`}
                      variant="outline"
                      className="h-11 px-3"
                      disabled={!!busyId}
                      onPress={() => respond('decline', invitation)}
                      accessibilityLabel={t('decline_invitation', 'Decline invitation')}
                    >
                      <X size={16} className="text-foreground" />
                    </Button>
                  </View>
                </View>
              ))
            )}

            <Button variant="ghost" onPress={backToSignIn} className="h-10">
              <Text className="text-primary text-sm font-semibold">
                {isAuthenticated ? t('sign_out', 'Sign out') : t('back_to_sign_in', 'Back to sign in')}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </ImageBackground>
    </>
  );
}
