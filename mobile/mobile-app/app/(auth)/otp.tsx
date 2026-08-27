import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { KeyRoundIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, ActivityIndicator, TextInput, ImageBackground, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

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
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, requestOtp, loading, error, clearStatus } = useAuth();
  const [resendCooldown, setResendCooldown] = React.useState(30);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: yupResolver(otpSchema),
    defaultValues: {
      code: '',
    },
  });

  React.useEffect(() => {
    clearStatus();
    return () => clearStatus();
  }, []);

  // Cooldown countdown timer for resending OTP
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const onSubmit = async (data: OtpFormValues) => {
    if (!phone) return;
    await verifyOtp(phone, data.code, false);
  };

  const handleResend = async () => {
    if (!phone || resendCooldown > 0) return;
    await requestOtp(phone, false);
    setResendCooldown(30);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Verify Identity' }} />
      <ImageBackground
        source={require('../../assets/images/auth-bg.jpg')}
        style={{ flex: 1 }}
        blurRadius={Platform.OS === 'ios' ? 3 : 2}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-white/40 dark:bg-[#0B0E14]/55" />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          className="p-6"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="bg-primary/10 p-4 rounded-full mb-3">
                <KeyRoundIcon className="size-8 text-primary" />
              </View>
              <Text className="text-2xl font-extrabold text-foreground tracking-tight">
                Enter Verification Code
              </Text>
              <Text className="text-muted-foreground text-sm text-center mt-1.5 px-4">
                We sent a verification code to your phone number:{'\n'}
                <Text className="font-semibold text-foreground">{phone || 'your phone'}</Text>
              </Text>
            </View>

            {/* Form Card */}
            <View className="bg-card border border-border rounded-2xl p-5 gap-4">
              <View className="gap-2">
                <Text className="text-foreground font-semibold text-sm">Security Code</Text>
                
                <Controller
                  control={control}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      placeholder="123456"
                      placeholderTextColor="#777"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="number-pad"
                      maxLength={8}
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit(onSubmit)}
                      className="bg-muted/50 text-foreground border border-border rounded-xl px-4 py-3.5 text-center text-lg font-bold tracking-[6px]"
                    />
                  )}
                />

                {errors.code && (
                  <Text className="text-rose-500 text-xs font-semibold mt-1">
                    {errors.code.message}
                  </Text>
                )}
              </View>

              {/* Error Banner */}
              {error && (
                <View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  <Text className="text-rose-500 text-xs text-center font-medium">{error}</Text>
                </View>
              )}

              <Button onPress={handleSubmit(onSubmit)} disabled={loading} className="mt-2 h-12">
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-primary-foreground">Verify & Sign In</Text>
                )}
              </Button>

              {/* Resend Helper */}
              <View className="items-center mt-2">
                {resendCooldown > 0 ? (
                  <Text className="text-muted-foreground text-xs font-medium">
                    Resend code in {resendCooldown}s
                  </Text>
                ) : (
                  <Button onPress={handleResend} variant="ghost" className="h-8">
                    <Text className="text-primary text-xs font-semibold">Resend verification code</Text>
                  </Button>
                )}
              </View>
            </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </ImageBackground>
    </>
  );
}
