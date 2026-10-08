import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Building2, Mail, ShieldCheck, Home } from 'lucide-react-native';
import * as React from 'react';
import { View, ActivityIndicator, ImageBackground, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import authService from '../../src/features/auth/services/authService';
import { setPendingInviteToken, clearPendingInviteToken } from '@/src/features/auth/utils/inviteContext';
import { useTranslation } from '@/src/utils/i18n';

type InviteState = 'loading' | 'valid' | 'invalid' | 'declined';

interface InviteMeta {
  orgName?: string;
  role?: string;
  unit?: string;
  email?: string;
  invitedEmail?: string;
  message?: string;
}

/** Pulls the invitation token from route params or, on web, from the URL. */
const resolveToken = (params: Record<string, string | undefined>): string => {
  const fromParams = params.token || params.code || params.inviteToken || params.invitationId;
  if (fromParams) return String(fromParams).trim();
  if (typeof window !== 'undefined' && window.location?.href) {
    const match = window.location.href.match(
      /[\/?&](?:token|code|inviteToken)=([^&#]+)|\/invite\/(?:app\/|web\/)?([^/?&#]+)/i
    );
    if (match) return decodeURIComponent(match[1] || match[2] || '').trim();
  }
  return '';
};

/**
 * "Step Into Your Community" landing for invitation links. Opening the link never
 * signs anyone in: it shows what the invitation is for, then the person signs in
 * with email/phone OTP or SSO and exactly this invitation is accepted.
 */
export default function AcceptInviteScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<Record<string, string>>();
  const { isAuthenticated, respondToInvitation, logout } = useAuth() as any;
  const token = React.useMemo(() => resolveToken(params), [params.token, params.code, params.inviteToken, params.invitationId]);
  const wantsDecline = params.action === 'reject';

  const [state, setState] = React.useState<InviteState>('loading');
  const [meta, setMeta] = React.useState<InviteMeta>({});
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setState('invalid');
      setMeta({ message: t('invite_link_incomplete', 'This invitation link is incomplete. Please open the link from your email again.') });
      return;
    }
    setPendingInviteToken(token);
    authService
      .validateInvite(token)
      .then((res: any) => {
        const data = res?.data?.data || res?.data || {};
        setMeta(data);
        setState(data.valid === false || ['EXPIRED', 'REVOKED', 'REJECTED'].includes(data.state) ? 'invalid' : 'valid');
      })
      .catch((err: any) => {
        setMeta({ message: err?.response?.data?.message || t('invite_invalid', 'This invitation is no longer valid.') });
        setState('invalid');
      });
  }, [token]);

  const stepIn = async () => {
    setMessage(null);
    if (!isAuthenticated) {
      // Same sign-in page as everyone else; the invitation travels with it
      router.replace({ pathname: '/(auth)/login', params: { inviteToken: token, email: meta.invitedEmail || meta.email || '' } });
      return;
    }
    setBusy(true);
    const result: any = await respondToInvitation({ action: 'accept', inviteToken: token });
    setBusy(false);
    if (result?.meta?.requestStatus === 'fulfilled') {
      clearPendingInviteToken();
      router.replace('/');
      return;
    }
    setMessage(result?.payload?.message || t('invite_accept_failed', 'Could not accept this invitation.'));
  };

  const decline = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await authService.rejectInvite({ token });
      clearPendingInviteToken();
      setState('declined');
    } catch (err: any) {
      setMessage(err?.response?.data?.message || t('invite_decline_failed', 'Could not decline this invitation.'));
    } finally {
      setBusy(false);
    }
  };

  const signInAsSomeoneElse = async () => {
    await logout();
    router.replace({ pathname: '/(auth)/login', params: { inviteToken: token } });
  };

  const detail = (Icon: any, label: string, value?: string) =>
    value ? (
      <View className="flex-row items-center gap-2.5">
        <Icon size={16} className="text-muted-foreground" />
        <Text className="text-xs text-muted-foreground w-28">{label}</Text>
        <Text className="text-sm font-semibold text-foreground flex-1" numberOfLines={1}>{value}</Text>
      </View>
    ) : null;

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
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="p-6">
          <View className="max-w-sm mx-auto w-full bg-white/80 dark:bg-[#1C1917]/80 border border-white/70 dark:border-white/15 rounded-3xl p-6 gap-4">
            {state === 'loading' ? (
              <ActivityIndicator />
            ) : state === 'declined' ? (
              <>
                <Text className="text-xl font-extrabold text-foreground text-center">{t('invite_declined', 'Invitation declined')}</Text>
                <Text className="text-sm text-muted-foreground text-center">
                  {t('invite_declined_help', 'You will not be added to this community. You can close this screen.')}
                </Text>
                <Button variant="ghost" onPress={() => router.replace('/')}>
                  <Text className="text-primary font-semibold">{t('done', 'Done')}</Text>
                </Button>
              </>
            ) : state === 'invalid' ? (
              <>
                <Text className="text-xl font-extrabold text-foreground text-center">{t('invite_unavailable', 'Invitation unavailable')}</Text>
                <Text testID="invite-invalid-message" className="text-sm text-muted-foreground text-center">
                  {meta.message || t('invite_invalid', 'This invitation is no longer valid.')}
                </Text>
                <Button variant="ghost" onPress={() => router.replace('/(auth)/login')}>
                  <Text className="text-primary font-semibold">{t('go_to_sign_in', 'Go to sign in')}</Text>
                </Button>
              </>
            ) : (
              <>
                <View className="items-center gap-2">
                  <View className="bg-primary/10 p-4 rounded-full">
                    <Building2 size={28} className="text-primary" />
                  </View>
                  <Text className="text-xl font-extrabold text-foreground text-center">
                    {t('invited_to', "You're invited to")} {meta.orgName || t('a_community', 'a community')}
                  </Text>
                </View>
                <View className="gap-2.5 bg-muted/40 rounded-2xl p-3.5">
                  {detail(Building2, t('community', 'Community'), meta.orgName)}
                  {detail(Mail, t('registered_email', 'Registered email'), meta.invitedEmail || meta.email)}
                  {detail(ShieldCheck, t('role', 'Role'), meta.role)}
                  {detail(Home, t('unit', 'Unit'), meta.unit)}
                </View>

                {message ? (
                  <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 gap-2">
                    <Text className="text-destructive text-xs text-center font-medium">{message}</Text>
                    {isAuthenticated && (
                      <Button variant="ghost" className="h-8" onPress={signInAsSomeoneElse}>
                        <Text className="text-primary text-xs font-semibold">{t('sign_in_different_account', 'Sign in with a different account')}</Text>
                      </Button>
                    )}
                  </View>
                ) : null}

                {wantsDecline ? (
                  <Button testID="invite-decline" className="h-12" disabled={busy} onPress={decline} variant="destructive">
                    {busy ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">{t('decline_invitation', 'Decline invitation')}</Text>}
                  </Button>
                ) : (
                  <>
                    <Button testID="invite-step-in" className="h-12" disabled={busy} onPress={stepIn}>
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="font-bold text-primary-foreground">{t('step_into_community', 'Step Into Your Community')}</Text>
                      )}
                    </Button>
                    <Button testID="invite-decline" variant="ghost" className="h-10" disabled={busy} onPress={decline}>
                      <Text className="text-muted-foreground text-sm font-semibold">{t('decline_invitation', 'Decline invitation')}</Text>
                    </Button>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </ImageBackground>
    </>
  );
}
