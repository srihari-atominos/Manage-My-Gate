import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { KeyRoundIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ActivityIndicator, TextInput, ImageBackground, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useTranslation } from '@/src/utils/i18n';
import { KeyboardAwareScrollView } from '@/components/layout/KeyboardAwareScrollView';
import { getPendingInviteToken, clearPendingInviteToken } from '@/src/features/auth/utils/inviteContext';

/** Matches the server's per-identifier resend cooldown. */
export const RESEND_COOLDOWN_SECONDS = 25;

/** Codes after which the current code can no longer be used. */
const CODE_IS_DEAD = new Set(['OTP_EXHAUSTED', 'OTP_EXPIRED']);

const otpSchema = yup.object().shape({
  code: yup
    .string()
    .required('Verification code is required')
    .matches(/^\d{4,8}$/, 'Code must be between 4 and 8 digits'),
});

interface OtpFormValues {
  code: string;
}

export default function OtpScreen() {
  const { t } = useTranslation();
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const { verifyOtp, requestOtp, loading, error, errorDetail, clearStatus } = useAuth() as any;
  const [resendIn, setResendIn] = React.useState(RESEND_COOLDOWN_SECONDS);
  const [codeIsDead, setCodeIsDead] = React.useState(false);

  // Fix URL decoding issue where '+' might have been converted to a space
  const fixedPhone = phone ? phone.replace(/\s/g, '+') : undefined;
  const fixedEmail = email ? email.replace(/\s/g, '+') : undefined;
  const identifier = fixedEmail || fixedPhone || '';
  const isEmail = !!fixedEmail;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<OtpFormValues>({
    resolver: yupResolver(otpSchema),
    defaultValues: { code: '' },
  });

  React.useEffect(() => () => clearStatus(), []);

  // Server-driven state: a used-up/expired code, or a cooldown/lock on requests
  React.useEffect(() => {
    if (!errorDetail?.code) return;
    if (CODE_IS_DEAD.has(errorDetail.code)) setCodeIsDead(true);
    if (typeof errorDetail.retryAfterSeconds === 'number') setResendIn(errorDetail.retryAfterSeconds);
  }, [errorDetail]);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn > 0]);

  const onSubmit = async (data: OtpFormValues) => {
    if (!identifier || codeIsDead) return;
    const result: any = await verifyOtp(identifier, data.code, isEmail, getPendingInviteToken());
    if (result?.meta?.requestStatus !== 'fulfilled') return;
    if (result.payload?.selection) {
      // Verified, but which invitation to accept is the person's choice
      router.replace('/(auth)/pending-invitations' as any);
      return;
    }
    clearPendingInviteToken();
    router.replace('/');
  };

  const handleResend = async () => {
    if (!identifier || resendIn > 0) return;
    const result: any = await requestOtp(identifier, isEmail);
    if (result?.meta?.requestStatus === 'fulfilled') {
      setCodeIsDead(false);
      reset({ code: '' });
      setResendIn(RESEND_COOLDOWN_SECONDS);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('verify_identity', 'Verify Identity') }} />
      <ImageBackground
        source={require('../../assets/images/auth-bg.jpg')}
        style={{ flex: 1 }}
        blurRadius={Platform.OS === 'ios' ? 3 : 2}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-white/40 dark:bg-[#0B0E14]/55" />
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          className="p-6"
        >
          <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full">
            <View className="items-center mb-6">
              <View className="bg-primary/10 p-4 rounded-full mb-3">
                <KeyRoundIcon className="size-8 text-primary" />
              </View>
              <Text className="text-2xl font-extrabold text-foreground tracking-tight">
                {t('enter_verification_code', 'Enter Verification Code')}
              </Text>
              <Text className="text-muted-foreground text-sm text-center mt-1.5 px-4">
                {isEmail
                  ? t('sent_code_email', 'If an account exists, we sent a verification code to:')
                  : t('sent_code_phone', 'If an account exists, we sent a verification code to:')}
                {'\n'}
                <Text className="font-semibold text-foreground">{identifier}</Text>
              </Text>
            </View>

            <View
              style={{ shadowColor: '#1C1917', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 }}
              className="bg-white/75 dark:bg-[#1C1917]/75 backdrop-blur-xl border border-white/70 dark:border-white/15 rounded-3xl p-5 gap-4 shadow-xl shadow-black/5"
            >
              <View className="gap-2">
                <Text className="text-[#1C1917] dark:text-white font-semibold text-sm">{t('security_code', 'Security Code')}</Text>
                <Controller
                  control={control}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      testID="otp-code-input"
                      placeholder="123456"
                      placeholderTextColor="#78716C"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!codeIsDead}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      maxLength={8}
                      className="bg-white/75 dark:bg-[#292524]/75 text-[#1C1917] dark:text-white border border-white/80 dark:border-white/20 rounded-xl px-4 py-3.5 text-center text-lg font-bold tracking-[6px] shadow-2xs"
                    />
                  )}
                />
                {errors.code && (
                  <Text className="text-destructive text-xs font-semibold mt-1">{errors.code.message}</Text>
                )}
              </View>

              {error ? (
                <View testID="otp-error" className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <Text className="text-destructive text-xs text-center font-medium">{error}</Text>
                </View>
              ) : null}

              {codeIsDead ? (
                <Button testID="otp-request-new" onPress={handleResend} disabled={loading || resendIn > 0} className="mt-2 h-12">
                  <Text className="font-bold text-primary-foreground">
                    {resendIn > 0
                      ? `${t('request_new_otp', 'Request New OTP')} (${resendIn}s)`
                      : t('request_new_otp', 'Request New OTP')}
                  </Text>
                </Button>
              ) : (
                <Button testID="otp-verify" onPress={handleSubmit(onSubmit)} disabled={loading} className="mt-2 h-12">
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-bold text-primary-foreground">{t('verify_and_sign_in', 'Verify & Sign In')}</Text>
                  )}
                </Button>
              )}

              {!codeIsDead && (
                <View className="items-center mt-2 gap-1">
                  <Text className="text-muted-foreground text-xs font-medium">
                    {t('didnt_receive_otp', "Didn't receive the OTP?")}
                  </Text>
                  {resendIn > 0 ? (
                    <Text testID="otp-resend-countdown" className="text-muted-foreground text-xs font-medium">
                      {`${t('resend_available_in', 'Resend available in')} ${resendIn} ${t('seconds', 'seconds')}`}
                    </Text>
                  ) : (
                    <Button testID="otp-resend" onPress={handleResend} variant="ghost" className="h-8">
                      <Text className="text-primary text-xs font-semibold">{t('resend_verification_code', 'Resend verification code')}</Text>
                    </Button>
                  )}
                </View>
              )}
            </View>
          </View>
        </KeyboardAwareScrollView>
      </ImageBackground>
    </>
  );
}
