import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import { PhoneIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

const loginSchema = yup.object().shape({
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Enter a valid international phone number (e.g., +919988776655)'),
});

interface LoginFormValues {
  phone: string;
}

export default function LoginScreen() {
  const { requestOtp, loading, error, otpSent, clearStatus } = useAuth();
  const [submittedPhone, setSubmittedPhone] = React.useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      phone: '',
    },
  });

  React.useEffect(() => {
    clearStatus();
    return () => clearStatus();
  }, []);

  // Reactively route to OTP screen once the OTP is successfully dispatched
  React.useEffect(() => {
    if (otpSent && submittedPhone) {
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: submittedPhone },
      });
    }
  }, [otpSent, submittedPhone]);

  const onSubmit = async (data: LoginFormValues) => {
    setSubmittedPhone(data.phone);
    await requestOtp(data.phone, false);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Resident Sign In' }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background p-6">
        <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full">
          {/* Brand Logo Header */}
          <View className="items-center mb-6">
            <View className="bg-primary/10 p-4 rounded-full mb-3">
              <PhoneIcon className="size-8 text-primary" />
            </View>
            <Text className="text-2xl font-extrabold text-foreground tracking-tight">
              Manage-My-Gate
            </Text>
            <Text className="text-muted-foreground text-sm text-center mt-1.5 px-4">
              Enter your registered mobile number to securely sign in to your villa context
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-card border border-border rounded-2xl p-5 gap-4">
            <View className="gap-2">
              <Text className="text-foreground font-semibold text-sm">Mobile Number</Text>
              
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    placeholder="+919988776655"
                    placeholderTextColor="#777"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    className="bg-muted/50 text-foreground border border-border rounded-xl px-4 py-3.5 text-sm"
                  />
                )}
              />

              {errors.phone && (
                <Text className="text-rose-500 text-xs font-semibold mt-1">
                  {errors.phone.message}
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
                <Text className="font-bold text-primary-foreground">Get Verification Code</Text>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
