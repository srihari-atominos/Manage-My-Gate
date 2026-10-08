import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { KeyboardAvoidingShell } from '@/components/layout/KeyboardAvoidingShell';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { GoogleSignInButton } from '@/src/features/auth/components/GoogleSignInButton';
import { AppleSignInButton } from '@/src/features/auth/components/AppleSignInButton';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { acceptInviteThunk } from '@/src/features/auth/store/authSlice';
import authService from '@/src/features/auth/services/authService';
import apiClient from '@/src/services/apiClient';
import { AppLoader } from '@/components/ui/AppLoader';

type InviteState = 'loading' | 'valid' | 'invalid' | 'declined';

interface InviteMeta {
  orgName?: string;
  role?: string;
  unit?: string;
  email?: string;
  invitedEmail?: string;
  message?: string;
}

export default function AcceptInviteScreen() {
  const {
    isAuthenticated,
    isInitialized,
    user,
    clearStatus,
    acceptInvite,
    logout,
    switchWorkspaceContext,
  } = useAuth();
  const searchParams = useLocalSearchParams<{
    token?: string;
    invitationId?: string;
    code?: string;
    email?: string;
    action?: string;
    mode?: string;
  }>();
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState<'accept' | 'otp'>('accept');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isRejecting, setIsRejecting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [inviteMeta, setInviteMeta] = useState<{
    state?: string;
    valid?: boolean;
    orgId?: string;
    orgName?: string;
    villa?: string;
    unit?: string;
    role?: string;
    email?: string;
    invitedEmail?: string;
    authenticatedEmail?: string;
    membershipStatus?: string;
    invitationStatus?: string;
    message?: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const acceptedNavigationRef = useRef(false);

  // Status & Modal visibility states
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [isRejectedState, setIsRejectedState] = useState(false);
  const [isAlreadyRegisteredModalVisible, setIsAlreadyRegisteredModalVisible] = useState(false);
  const [isInvalidTokenModalVisible, setIsInvalidTokenModalVisible] = useState(false);
  const [alreadyRegisteredEmail, setAlreadyRegisteredEmail] = useState('');

  const loggedInEmail = (user?.email || '').trim().toLowerCase();
  const targetInviteEmail = (
    inviteMeta?.invitedEmail ||
    inviteMeta?.email ||
    searchParams.email ||
    alreadyRegisteredEmail ||
    ''
  )
    .trim()
    .toLowerCase();
  const flowState = (inviteMeta?.state || '').toUpperCase();
  const isAlreadyAccepted = flowState === 'ALREADY_ACCEPTED';
  const isResolvingInvite = validating || (isAlreadyAccepted && isAuthenticated && submitting);
  const isAccountMismatch =
    flowState === 'ACCOUNT_MISMATCH' ||
    flowState === 'ALREADY_ACCEPTED_OTHER_ACCOUNT' ||
    Boolean(
      isAuthenticated && loggedInEmail && targetInviteEmail && loggedInEmail !== targetInviteEmail
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

  useEffect(() => {
    clearStatus();
    return () => {
      clearStatus();
      if (
        Platform.OS === 'web' &&
        typeof document !== 'undefined' &&
        document.activeElement instanceof HTMLElement
      ) {
        document.activeElement.blur();
      }
    };
  }, [clearStatus]);


  const handleInitiateOtp = async () => {
    setSubmitting(true);
    setApiError(null);
    try {
      const inviteToken = (resolvedToken || getTokenFromContext() || '').trim();
      await authService.initiateInvitationOtp(inviteToken);
      setOtpStep('otp');
      setResendCooldown(30);
    } catch (err: any) {
      setApiError(err?.message || err?.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setSubmitting(true);
    setApiError(null);
    try {
      const inviteToken = (resolvedToken || getTokenFromContext() || '').trim();
      const res = await authService.verifyInvitationOtp(inviteToken, otpCode);
      
      // Update store by switching to the workspace
      await switchWorkspaceContext({ targetOrgId: inviteMeta?.orgId }).unwrap().catch(() => null);
      
      router.replace('/(resident)/dashboard');
    } catch (err: any) {
      setApiError(err?.message || err?.response?.data?.message || 'Invalid verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = async (data: AcceptInviteFormValues) => {
    setSubmitting(true);
    setApiError(null);
    let targetEmail = (searchParams.email || inviteMeta?.email || '').trim();

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

                
                {inviteMeta?.authenticationMethod === 'OTP_LOGIN' ? (
                  <View className="mt-2">
                    {otpStep === 'accept' ? (
                      <View className="flex-col gap-3">
                        <Text className="text-sm text-muted-foreground text-center mb-2">
                          This workspace uses secure OTP login. Click below to receive a verification code.
                        </Text>
                        {apiError ? <ErrorBanner message={apiError} /> : null}
                        <View className="mt-2 flex-col gap-2 sm:flex-row">
                          <Button
                            onPress={handleInitiateOtp}
                            loading={submitting}
                            disabled={isRejecting}
                            textClassName="font-bold text-base text-white"
                            className="h-12 flex-1 items-center justify-center rounded-xl bg-emerald-600">
                            Accept Invitation
                          </Button>
                          <Button
                            onPress={handleRejectInvitation}
                            loading={isRejecting}
                            disabled={submitting}
                            variant="outline"
                            className="h-12 items-center justify-center rounded-xl border-red-500/30 px-4"
                            textClassName="font-semibold text-sm text-red-600">
                            Reject
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-col gap-3">
                        <Text className="text-sm text-center mb-2 text-muted-foreground">
                          A verification code has been sent to <Text className="font-semibold text-foreground">{inviteMeta?.email}</Text>.
                        </Text>
                        <Input
                          label="Verification Code"
                          placeholder="123456"
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otpCode}
                          onChangeText={setOtpCode}
                          autoCapitalize="none"
                        />
                        {apiError ? <ErrorBanner message={apiError} /> : null}
                        
                        <Button
                          onPress={handleVerifyOtp}
                          loading={submitting}
                          disabled={otpCode.length < 6}
                          textClassName="font-bold text-base text-white"
                          className="h-12 w-full items-center justify-center rounded-xl bg-emerald-600 mt-2">
                          Verify & Sign In
                        </Button>
                        
                        <Button
                          variant="ghost"
                          onPress={handleInitiateOtp}
                          disabled={resendCooldown > 0 || submitting}
                          className="mt-2">
                          <Text>{resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Verification Code'}</Text>
                        </Button>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    {/* Password Form (Wrapped in form on Web to satisfy browser password managers) */}
                {Platform.OS === 'web' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveAndConfirm();
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
                    {/* New Password Field */}
                    <Controller
                      control={form.control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View>
                          <Input
                            label="New Password"
                            placeholder="••••••••"
                            isPassword
                            leftIcon={<Lock size={18} className="me-1 text-muted-foreground" />}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            error={form.formState.errors.password?.message}
                          />
                          <PasswordStrengthIndicator password={value} />
                        </View>
                      )}
                    />

                    {/* Confirm Password Field */}
                    <Controller
                      control={form.control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Confirm New Password"
                          placeholder="••••••••"
                          isPassword
                          leftIcon={<Lock size={18} className="me-1 text-muted-foreground" />}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          autoCapitalize="none"
                          autoComplete="new-password"
                          error={form.formState.errors.confirmPassword?.message}
                        />
                      )}
                    />
                  </form>
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

                {/* Global Error Banner */}
                {apiError ? <ErrorBanner message={apiError} /> : null}

                {/* Accept & Reject Action Buttons */}
                <View className="mt-2 flex-col gap-2 sm:flex-row">
                  <Button
                    onPress={handleSaveAndConfirm}
                    loading={submitting}
                    disabled={isRejecting}
                    textClassName="font-bold text-base text-white"
                    className="h-12 flex-1 items-center justify-center rounded-xl bg-emerald-600">
                    Accept Invitation
                  </Button>
                  <Button
                    onPress={handleRejectInvitation}
                    loading={isRejecting}
                    disabled={submitting}
                    variant="outline"
                    className="h-12 items-center justify-center rounded-xl border-red-500/30 px-4"
                    textClassName="font-semibold text-sm text-red-600">
                    Reject
                  </Button>

                </View>
                  </>
                )}
              </View>
{/* SSO Separator */}
              <View className="my-2 flex-row items-center">
                <View className="h-px flex-1 bg-border" />
                <Text className="px-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  OR ACCEPT WITH SSO
                </Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              {/* SSO Buttons */}
              <View className="flex-col gap-2.5 sm:flex-row sm:gap-3">
                <View className="flex-1">
                  <GoogleSignInButton
                    inviteToken={currentInviteToken}
                    onSuccess={handleSsoSuccess}
                    onError={handleSsoError}
                  />
                </View>
                {Platform.OS === 'ios' ? (
                  <View className="flex-1">
                    <AppleSignInButton
                      inviteToken={currentInviteToken}
                      onSuccess={handleSsoSuccess}
                      onError={handleSsoError}
                    />
                  </View>
                ) : null}
              </View>

              {/* Return to Login Link */}
              <View className="mt-2 items-center">
                <Button variant="link" onPress={() => router.push({ pathname: '/(auth)/login' })}>
                  <Text className="font-medium text-sm text-primary">
                    Already have an active account? Sign In
                  </Text>
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingShell>

      {/* MODAL 1: Account Already Registered Notification Popup */}
      <ConfirmationModal
        visible={isAlreadyRegisteredModalVisible}
        title="Already Registered"
        message="Your account is already active and your password has been set. Please sign in to access your workspace."
        confirmLabel="Sign In"
        cancelLabel="Dismiss"
        variant="info"
        onConfirm={() => {
          setIsAlreadyRegisteredModalVisible(false);
          handleNavigateToLogin(alreadyRegisteredEmail);
        }}
        onCancel={() => setIsAlreadyRegisteredModalVisible(false)}
      />

      {/* MODAL 2: Invalid or Expired Token Popup */}
      <ConfirmationModal
        visible={isInvalidTokenModalVisible && !isAlreadyRegistered}
        title="Invitation Link Expired"
        message="This invitation link is invalid or has already been used. If you have already set up your password, please sign in."
        confirmLabel="Go to Sign In"
        cancelLabel="Dismiss"
        variant="warning"
        onConfirm={() => {
          setIsInvalidTokenModalVisible(false);
          handleNavigateToLogin();
        }}
        onCancel={() => setIsInvalidTokenModalVisible(false)}
      />
    </>
  );
}


