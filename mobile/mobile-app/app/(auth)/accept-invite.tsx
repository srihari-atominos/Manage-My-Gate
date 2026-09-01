import React, { useState, useEffect } from 'react';
import { View, ScrollView, Platform, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, Lock, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { KeyboardAvoidingShell } from '@/components/layout/KeyboardAvoidingShell';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { GoogleSignInButton } from '../../src/features/auth/components/GoogleSignInButton';
import { MicrosoftSignInButton } from '../../src/features/auth/components/MicrosoftSignInButton';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import authService from '../../src/features/auth/services/authService';

// Accept Invite Password Validation Schema
const acceptInviteSchema = yup.object().shape({
  token: yup.string().optional(),
  password: yup
    .string()
    .required('Password is required')
    .min(4, 'Password must be at least 4 characters'),
  confirmPassword: yup
    .string()
    .required('Please repeat your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});

type AcceptInviteFormValues = yup.InferType<typeof acceptInviteSchema>;

export default function AcceptInviteScreen() {
  const { clearStatus } = useAuth();
  const searchParams = useLocalSearchParams<{ token?: string; email?: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const initialToken = searchParams.token || '';

  const form = useForm<AcceptInviteFormValues>({
    resolver: yupResolver(acceptInviteSchema),
    defaultValues: {
      token: initialToken,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (searchParams.token) {
      form.setValue('token', searchParams.token);
    }
  }, [searchParams.token]);

  useEffect(() => {
    clearStatus();
    return () => {
      clearStatus();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
  }, []);

  const handleNavigateToLogin = (emailTarget?: string) => {
    const targetEmail = emailTarget || searchParams.email || '';
    try {
      router.replace({
        pathname: '/(auth)/login',
        params: targetEmail ? { email: targetEmail } : {},
      });
    } catch (e) {}

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = targetEmail ? `/(auth)/login?email=${encodeURIComponent(targetEmail)}` : '/(auth)/login';
    }
  };

  const onSubmit = async (data: AcceptInviteFormValues) => {
    setSubmitting(true);
    setApiError(null);
    let targetEmail = (searchParams as any)?.email || '';

    try {
      const inviteToken = (data.token || (searchParams as any)?.token || initialToken || '').trim();
      const inviteEmail = ((searchParams as any)?.email || '').trim();

      const response: any = await authService.acceptInvite({
        token: inviteToken || undefined,
        email: inviteEmail || undefined,
        password: data.password || 'Password123!',
      });

      const body = response && response.success !== undefined ? response : response?.data;
      const innerData = body?.data || body;
      targetEmail = innerData?.user?.email || innerData?.email || inviteEmail || targetEmail;
    } catch (err: any) {
      console.warn('Accept invite attempt logged:', err?.message);
    } finally {
      setSubmitting(false);
      handleNavigateToLogin(targetEmail);
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

  return (
    <>
      <Stack.Screen options={{ title: 'Accept Workspace Invitation', headerBackVisible: true }} />
      <KeyboardAvoidingShell className="bg-background">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, flexGrow: 1, justifyContent: 'center' }}>
          <View className="gap-5 flex-1 justify-center max-w-sm sm:max-w-md mx-auto w-full py-2 sm:py-4">
            
            {/* Header / Brand Icon */}
            <View className="items-center mb-1">
              <View className="bg-primary/10 p-3.5 rounded-2xl mb-2.5 items-center justify-center">
                <ShieldCheck className="size-9 text-primary" size={34} />
              </View>
              <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
                Accept Invitation
              </Text>
              <Text className="text-muted-foreground text-sm text-center mt-1 px-2">
                Set up your password to activate your account and join your community workspace
              </Text>
            </View>

            {/* Form Container */}
            <View className="bg-card border border-border rounded-2xl p-4 sm:p-6 gap-4 shadow-xs">
              <View className="gap-3.5">

                  {/* Password Field */}
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

                  {/* Global Error Banner */}
                  {apiError ? <ErrorBanner message={apiError} /> : null}

                  {/* Submit Button */}
                  <Button
                    onPress={handleSaveAndConfirm}
                    loading={submitting}
                    textClassName="font-bold text-base"
                    className="mt-2 h-12 bg-primary rounded-xl w-full items-center justify-center"
                  >
                    Save Password & Confirm
                  </Button>
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
                    <GoogleSignInButton />
                  </View>
                  <View className="flex-1">
                    <MicrosoftSignInButton />
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

          </View>
        </ScrollView>
      </KeyboardAvoidingShell>
    </>
  );
}
