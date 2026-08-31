import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { KeyRoundIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, TextInput, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

const otpSchema = yup.object().shape({
  code: yup
    .string()
    .required('Verification code is required')
    .matches(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

interface OtpFormValues {
  code: string;
}

export default function RegisterOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyRegistration, requestRegistrationOtp, loading, error, successMsg, isAuthenticated, clearStatus } = useAuth();
  
  // Fix URL decoding issue where '+' might have been converted to a space
  const fixedEmail = email ? email.replace(/\s/g, '+') : '';

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
    return () => clearStatus();
  }, []);

  React.useEffect(() => {
    if (successMsg) {
      Alert.alert('Verification', successMsg);
    }
  }, [successMsg]);

  const onSubmit = async (data: OtpFormValues) => {
    if (!fixedEmail) return;
    await verifyRegistration(fixedEmail, data.code);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Verify Email' }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background p-6">
        <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full py-8">
          {/* Header */}
          <View className="items-center mb-6">
            <View className="bg-primary/10 p-4 rounded-full mb-3">
              <KeyRoundIcon className="size-8 text-primary" />
            </View>
            <Text className="text-2xl font-extrabold text-foreground tracking-tight">
              Enter Verification Code
            </Text>
            <Text className="text-muted-foreground text-sm text-center mt-1.5 px-4">
              We sent a verification code to your email:{'\n'}
              <Text className="font-semibold text-foreground">{fixedEmail || 'your email'}</Text>
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
                    maxLength={6}
                    className="bg-muted/50 text-foreground border border-border rounded-xl px-4 py-3.5 text-center text-lg font-bold tracking-[6px]"
                  />
                )}
              />

              {errors.code && (
                <Text className="text-destructive text-xs font-semibold mt-1">
                  {errors.code.message}
                </Text>
              )}
            </View>

            {/* Error Banner */}
            {error && (
              <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <Text className="text-destructive text-xs text-center font-medium">{error}</Text>
              </View>
            )}

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              textClassName="font-bold text-base"
              className="mt-2 h-12"
            >
              Verify & Sign In
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
