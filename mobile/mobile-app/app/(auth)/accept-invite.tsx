import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Platform, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { KeyboardAvoidingShell } from '@/components/layout/KeyboardAvoidingShell';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { GoogleSignInButton } from '../../src/features/auth/components/GoogleSignInButton';
import { AppleSignInButton } from '../../src/features/auth/components/AppleSignInButton';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import authService from '../../src/features/auth/services/authService';
import apiClient from '../../src/services/apiClient';

// Accept Invite Password Validation Schema - token is managed silently, not by user input
const acceptInviteSchema = yup.object().shape({
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please repeat your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});

type AcceptInviteFormValues = yup.InferType<typeof acceptInviteSchema>;

export default function AcceptInviteScreen() {
  const { isAuthenticated, user, clearStatus } = useAuth();
  const searchParams = useLocalSearchParams<{ token?: string; code?: string; email?: string; action?: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [inviteMeta, setInviteMeta] = useState<{ orgName?: string; villa?: string; unit?: string; role?: string; email?: string; membershipStatus?: string } | null>(null);
  const [validating, setValidating] = useState(false);

  // Status & Modal visibility states
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [isRejectedState, setIsRejectedState] = useState(false);
  const [isAlreadyRegisteredModalVisible, setIsAlreadyRegisteredModalVisible] = useState(false);
  const [isInvalidTokenModalVisible, setIsInvalidTokenModalVisible] = useState(false);
  const [alreadyRegisteredEmail, setAlreadyRegisteredEmail] = useState('');

  // Extract token from route searchParams, query params, or URL path
  const getTokenFromContext = useCallback(() => {
    if (searchParams.token) return searchParams.token;
    if (searchParams.code) return searchParams.code;
    if (typeof window !== 'undefined' && window.location?.href) {
      const match = window.location.href.match(/[\/?&](?:token|code)=([^&#]+)|\/invite\/(?:app\/|web\/)?([a-f0-9]{32,64}|[^/?&#]+)/i);
      if (match) return match[1] || match[2];
    }
    return '';
  }, [searchParams.token, searchParams.code]);

  const getActionFromContext = useCallback(() => {
    if (searchParams.action) return searchParams.action;
    if (typeof window !== 'undefined' && window.location?.href) {
      const match = window.location.href.match(/[\/?&]action=([^&#]+)/i);
      if (match) return decodeURIComponent(match[1]);
    }
    return '';
  }, [searchParams.action]);

  const [resolvedToken, setResolvedToken] = useState<string>(getTokenFromContext);
  const [resolvedAction, setResolvedAction] = useState<string>(getActionFromContext);

  useEffect(() => {
    const extracted = getTokenFromContext();
    if (extracted && extracted !== resolvedToken) {
      setResolvedToken(extracted);
    }
  }, [getTokenFromContext, resolvedToken]);

  useEffect(() => {
    const extracted = getActionFromContext();
    if (extracted && extracted !== resolvedAction) {
      setResolvedAction(extracted);
    }
  }, [getActionFromContext, resolvedAction]);

  const form = useForm<AcceptInviteFormValues>({
    resolver: yupResolver(acceptInviteSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleNavigateToLogin = useCallback((emailTarget?: string) => {
    const targetEmail = (emailTarget || searchParams.email || alreadyRegisteredEmail || inviteMeta?.email || '').trim();
    const currentToken = (resolvedToken || getTokenFromContext() || searchParams.token || searchParams.code || '').trim();
    const loginParams: Record<string, string> = {};
    if (targetEmail) loginParams.email = targetEmail;
    if (currentToken) loginParams.inviteToken = currentToken;

    try {
      router.replace({
        pathname: '/(auth)/login',
        params: loginParams,
      });
    } catch (e) {}

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const q = new URLSearchParams(loginParams);
      const url = q.toString() ? `/(auth)/login?${q.toString()}` : '/(auth)/login';
      if (!window.location.pathname.includes('login')) {
        window.location.href = url;
      }
    }
  }, [searchParams.email, searchParams.token, searchParams.code, resolvedToken, getTokenFromContext, alreadyRegisteredEmail, inviteMeta?.email]);

  const handleRejectInvitation = useCallback(async () => {
    setIsRejecting(true);
    setApiError(null);
    const targetEmail = (searchParams.email || inviteMeta?.email || '').trim();
    const inviteToken = (resolvedToken || getTokenFromContext() || searchParams.token || searchParams.code || '').trim();
    try {
      await authService.rejectInvite({
        token: inviteToken,
        email: targetEmail || undefined,
      });
      setIsRejectedState(true);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg.toLowerCase().includes('reject')) {
        setIsRejectedState(true);
      } else {
        setApiError(errMsg || 'Failed to reject invitation.');
      }
    } finally {
      setIsRejecting(false);
    }
  }, [searchParams.email, searchParams.token, searchParams.code, inviteMeta?.email, resolvedToken, getTokenFromContext]);

  // Validate the invitation link on mount / token change
  useEffect(() => {
    const tokenToValidate = (resolvedToken || getTokenFromContext() || '').trim();
    const emailToValidate = (searchParams.email || '').trim();

    if (!tokenToValidate && !emailToValidate) {
      return;
    }

    let isMounted = true;
    setValidating(true);

    const checkInvite = async () => {
      const actionToPerform = (resolvedAction || getActionFromContext() || '').trim().toLowerCase();

      // If the incoming intent is explicitly to REJECT, execute rejection immediately
      // and do not evaluate registration or auto-login workflows.
      if (actionToPerform === 'reject') {
        await handleRejectInvitation();
        // Best-effort fetch invite metadata for clean community/role presentation
        try {
          const query = new URLSearchParams();
          if (tokenToValidate) query.append('token', tokenToValidate);
          if (emailToValidate) query.append('email', emailToValidate);
          const res: any = await apiClient.get(`/auth/validate-invite?${query.toString()}`);
          const data = res?.data?.data || res?.data || res;
          if (isMounted && data) {
            setInviteMeta(data);
          }
        } catch (_) {}
        if (isMounted) setValidating(false);
        return;
      }

      try {
        const query = new URLSearchParams();
        if (tokenToValidate) query.append('token', tokenToValidate);
        if (emailToValidate) query.append('email', emailToValidate);

        const res: any = await apiClient.get(`/auth/validate-invite?${query.toString()}`);
        const data = res?.data?.data || res?.data || res;

        if (isMounted && data && data.valid) {
          setInviteMeta(data);
          setApiError(null);

          if (data.membershipStatus === 'Rejected' || data.invitationStatus === 'REJECTED') {
            setIsRejectedState(true);
          } else if (data.isExisting || data.isAlreadyRegistered) {
            const userEmail = data.email || emailToValidate;
            setIsAlreadyRegistered(true);
            setAlreadyRegisteredEmail(userEmail);

            // Reconcile mobile notification / link navigation:
            // If the user is already authenticated on this device with the matching email,
            // accept the workspace invitation immediately without forcing a redundant sign-in.
            if (isAuthenticated && user?.email && user.email.toLowerCase() === userEmail.toLowerCase()) {
              try {
                await authService.acceptInvite({
                  token: tokenToValidate,
                  email: userEmail,
                });
                router.replace('/(resident)/dashboard');
                return;
              } catch (autoAcceptErr) {
                // If auto-accept fails, continue to standard modal
              }
            }

            setIsAlreadyRegisteredModalVisible(true);

            if (Platform.OS !== 'web') {
              Alert.alert(
                'Already Registered',
                'Your account is already active and your password has been set. Please sign in to access your community workspace.',
                [
                  {
                    text: 'Sign In',
                    onPress: () => handleNavigateToLogin(userEmail),
                  },
                ]
              );
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const errMsg = err?.response?.data?.message || err?.message || '';
          if (errMsg.toLowerCase().includes('reject')) {
            setIsRejectedState(true);
            setApiError(null);
          } else if (
            (errMsg.toLowerCase().includes('already') && (errMsg.toLowerCase().includes('active') || errMsg.toLowerCase().includes('registered') || errMsg.toLowerCase().includes('accepted') || errMsg.toLowerCase().includes('member'))) ||
            errMsg.toLowerCase().includes('active')
          ) {
            setIsAlreadyRegistered(true);
            setAlreadyRegisteredEmail(emailToValidate);
            setIsAlreadyRegisteredModalVisible(true);
          } else {
            setIsInvalidTokenModalVisible(true);
            setApiError(errMsg || 'This invitation link is invalid or has expired.');
          }
        }
      } finally {
        if (isMounted) setValidating(false);
      }
    };

    checkInvite();

    return () => {
      isMounted = false;
    };
  }, [resolvedToken, getTokenFromContext, resolvedAction, getActionFromContext, searchParams.email, handleNavigateToLogin, handleRejectInvitation]);

  useEffect(() => {
    clearStatus();
    return () => {
      clearStatus();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
  }, [clearStatus]);

  const onSubmit = async (data: AcceptInviteFormValues) => {
    setSubmitting(true);
    setApiError(null);
    let targetEmail = (searchParams.email || inviteMeta?.email || '').trim();

    try {
      const inviteToken = (resolvedToken || getTokenFromContext() || '').trim();

      const response: any = await authService.acceptInvite({
        token: inviteToken || undefined,
        email: targetEmail || undefined,
        password: data.password,
      });

      const body = response && response.success !== undefined ? response : response?.data;
      const innerData = body?.data || body;
      targetEmail = (innerData?.user?.email || innerData?.email || targetEmail).trim();

      // Directly redirect to login page immediately without any modal
      handleNavigateToLogin(targetEmail);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save password.';
      if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('active')) {
        // User account is already active -> directly redirect to login page immediately
        handleNavigateToLogin(targetEmail);
      } else {
        setApiError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndConfirm = () => {
    form.handleSubmit(
      (validData) => onSubmit(validData),
      (_errors) => {
        const currentVals = form.getValues();
        onSubmit(currentVals);
      }
    )();
  };

  const handleSsoSuccess = useCallback((_data: any) => {
    router.replace('/(resident)/dashboard');
  }, []);

  const handleSsoError = useCallback((err: any) => {
    const msg = typeof err === 'string' ? err : err?.message || 'Failed to accept invitation with SSO';
    setApiError(msg);
  }, []);

  const currentInviteToken = (resolvedToken || getTokenFromContext() || '').trim();

  return (
    <>
      <Stack.Screen options={{ title: 'Accept Workspace Invitation', headerBackVisible: true }} />
      <KeyboardAvoidingShell className="bg-background">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, flexGrow: 1, justifyContent: 'center' }}>
          <View className="gap-5 flex-1 justify-center max-w-sm sm:max-w-md mx-auto w-full py-2 sm:py-4">
            
            {/* Header / Brand Icon */}
            <View className="items-center mb-1">
              <View className={`${isRejectedState ? 'bg-red-500/10' : 'bg-primary/10'} p-3.5 rounded-2xl mb-2.5 items-center justify-center`}>
                {isRejectedState ? (
                  <XCircle className="size-9 text-red-600 dark:text-red-400" size={34} />
                ) : (
                  <ShieldCheck className="size-9 text-primary" size={34} />
                )}
              </View>
              <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
                {isRejectedState ? 'Invitation Declined' : 'Accept Invitation'}
              </Text>
              <Text className="text-muted-foreground text-sm text-center mt-1 px-2">
                {isRejectedState
                  ? 'You have declined this workspace invitation'
                  : 'Set up your password to activate your account and join your community workspace'}
              </Text>
            </View>

            {/* CASE 0: Invitation Rejected State */}
            {isRejectedState ? (
              <View className="bg-card border border-border rounded-2xl p-6 gap-4 shadow-xs items-center">
                <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-full items-center justify-center">
                  <XCircle size={38} className="text-red-600 dark:text-red-400" />
                </View>
                <View className="gap-1.5 items-center">
                  <Text className="text-xl font-extrabold text-foreground text-center">
                    Invitation Declined
                  </Text>
                  <Text className="text-sm text-muted-foreground text-center px-2">
                    {inviteMeta?.orgName
                      ? `You have declined the invitation to join ${inviteMeta.orgName}.`
                      : 'You have declined this workspace invitation.'}
                  </Text>
                  {inviteMeta?.role ? (
                    <Text className="text-xs text-muted-foreground text-center mt-1">
                      Role: <Text className="font-semibold text-foreground">{inviteMeta.role}</Text>
                    </Text>
                  ) : null}
                  <Text className="text-xs text-muted-foreground text-center mt-1 px-2">
                    No further action is required. You will not be added to this community.
                  </Text>
                </View>
                <Button
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      try {
                        router.replace('/');
                      } catch (_) {}
                    }
                  }}
                  variant="outline"
                  className="mt-3 h-12 border-border rounded-xl w-full items-center justify-center"
                  textClassName="font-semibold text-sm text-foreground"
                >
                  Close
                </Button>
                <Button
                  onPress={() => handleNavigateToLogin()}
                  variant="ghost"
                  className="h-10 w-full items-center justify-center"
                  textClassName="text-xs text-muted-foreground"
                >
                  Sign in with an existing account
                </Button>
              </View>
            ) : null}

            {/* CASE 1: Account Already Registered / Active State */}
            {!isRejectedState && isAlreadyRegistered ? (
              <View className="bg-card border border-border rounded-2xl p-6 gap-4 shadow-xs items-center">
                <View className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-full items-center justify-center">
                  <CheckCircle2 size={38} className="text-emerald-600 dark:text-emerald-400" />
                </View>
                <View className="gap-1.5 items-center">
                  <Text className="text-xl font-extrabold text-foreground text-center">
                    Account Already Active
                  </Text>
                  <Text className="text-sm text-muted-foreground text-center px-2">
                    {alreadyRegisteredEmail
                      ? `Your account for ${alreadyRegisteredEmail} has already been registered and your password is configured.`
                      : 'Your account has already been registered and your password is configured.'}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center mt-1">
                    Please sign in with your email and password to enter your workspace.
                  </Text>
                </View>
                <Button
                  onPress={() => handleNavigateToLogin(alreadyRegisteredEmail)}
                  className="mt-3 h-12 bg-primary rounded-xl w-full items-center justify-center"
                  textClassName="font-bold text-base"
                >
                  Sign In to Workspace
                </Button>
              </View>
            ) : null}

            {/* CASE 2: Invalid or Expired Token State */}
            {!isRejectedState && !isAlreadyRegistered && isInvalidTokenModalVisible && apiError ? (
              <View className="bg-card border border-border rounded-2xl p-6 gap-4 shadow-xs items-center">
                <View className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-full items-center justify-center">
                  <AlertCircle size={38} className="text-amber-600 dark:text-amber-400" />
                </View>
                <View className="gap-1.5 items-center">
                  <Text className="text-xl font-extrabold text-foreground text-center">
                    Invitation Expired or Used
                  </Text>
                  <Text className="text-sm text-muted-foreground text-center px-2">
                    {apiError}
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center mt-1">
                    If you already set your password, you can sign in directly to your account.
                  </Text>
                </View>
                <Button
                  onPress={() => handleNavigateToLogin()}
                  className="mt-3 h-12 bg-primary rounded-xl w-full items-center justify-center"
                  textClassName="font-bold text-base"
                >
                  Go to Sign In
                </Button>
              </View>
            ) : null}

            {/* CASE 3: Normal Form Container (Token valid, not yet registered, not rejected) */}
            {!isRejectedState && !isAlreadyRegistered && (!isInvalidTokenModalVisible || !apiError) ? (
              <View className="bg-card border border-border rounded-2xl p-4 sm:p-6 gap-4 shadow-xs">
                <View className="gap-3.5">

                  {inviteMeta ? (
                    <View className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-1">
                      <Text className="text-xs font-bold text-primary mb-1">
                        Community: {inviteMeta.orgName || 'Nahom Community'}
                      </Text>
                      {(() => {
                        const unitValue = (inviteMeta.unit || inviteMeta.villa || '').trim();
                        const isInvalidUnit =
                          !unitValue ||
                          unitValue.toLowerCase() === 'none' ||
                          (inviteMeta.role && unitValue.toLowerCase() === inviteMeta.role.trim().toLowerCase());
                        if (isInvalidUnit) return null;
                        return (
                          <Text className="text-xs text-muted-foreground">
                            Unit: <Text className="font-semibold text-foreground">{unitValue}</Text>
                          </Text>
                        );
                      })()}
                      {inviteMeta.role ? (
                        <Text className="text-xs text-muted-foreground">
                          Role: <Text className="font-semibold text-foreground">{inviteMeta.role}</Text>
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Password Form (Wrapped in form on Web to satisfy browser password managers) */}
                  {Platform.OS === 'web' ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveAndConfirm();
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}
                    >
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
                              leftIcon={<Lock size={18} className="text-muted-foreground me-1" />}
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
                            leftIcon={<Lock size={18} className="text-muted-foreground me-1" />}
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
                              leftIcon={<Lock size={18} className="text-muted-foreground me-1" />}
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
                            leftIcon={<Lock size={18} className="text-muted-foreground me-1" />}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            error={form.formState.errors.confirmPassword?.message}
                          />
                        )}
                      />
                    </>
                  )}

                  {/* Global Error Banner */}
                  {apiError ? <ErrorBanner message={apiError} /> : null}

                  {/* Accept & Reject Action Buttons */}
                  <View className="flex-col gap-2 sm:flex-row mt-2">
                    <Button
                      onPress={handleSaveAndConfirm}
                      loading={submitting}
                      disabled={isRejecting}
                      textClassName="font-bold text-base text-white"
                      className="flex-1 h-12 bg-emerald-600 rounded-xl items-center justify-center"
                    >
                      Accept Invitation
                    </Button>
                    <Button
                      onPress={handleRejectInvitation}
                      loading={isRejecting}
                      disabled={submitting}
                      variant="outline"
                      className="h-12 border-red-500/30 rounded-xl px-4 items-center justify-center"
                      textClassName="font-semibold text-sm text-red-600"
                    >
                      Reject
                    </Button>
                  </View>
                </View>

                {/* SSO Separator */}
                <View className="flex-row items-center my-2">
                  <View className="flex-1 h-px bg-border" />
                  <Text className="px-3 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                    OR ACCEPT WITH SSO
                  </Text>
                  <View className="flex-1 h-px bg-border" />
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
                  <View className="flex-1">
                    <AppleSignInButton />
                  </View>
                </View>

                {/* Return to Login Link */}
                <View className="items-center mt-2">
                  <Button
                    variant="link"
                    onPress={() => router.push({ pathname: '/(auth)/login' })}
                  >
                    <Text className="text-primary font-medium text-sm">
                      Already have an active account? Sign In
                    </Text>
                  </Button>
                </View>
              </View>
            ) : null}

          </View>
        </ScrollView>
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
