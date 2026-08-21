import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Stack, router } from 'expo-router';
import { ShieldCheck, Mail, Lock, Phone } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingShell } from '@/components/layout/KeyboardAvoidingShell';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

// Basic Auth Validation Schema
const basicAuthSchema = yup.object().shape({
  login: yup
    .string()
    .required('Email or Username is required')
    .min(3, 'Must be at least 3 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

// Phone OTP Validation Schema
const phoneSchema = yup.object().shape({
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Enter a valid international phone number (e.g., +919988776655)'),
});

interface BasicAuthFormValues {
  login: string;
  password: string;
}

interface PhoneFormValues {
  phone: string;
}

export default function LoginScreen() {
  const { login: performLogin, requestOtp, loading, error, isAuthenticated, otpSent, clearStatus } = useAuth();
  const [authMode, setAuthMode] = React.useState<'basic' | 'phone'>('basic');
  const [submittedPhone, setSubmittedPhone] = React.useState('');

  // Basic Auth Form Hook
  const basicForm = useForm<BasicAuthFormValues>({
    resolver: yupResolver(basicAuthSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  // Phone Form Hook
  const phoneForm = useForm<PhoneFormValues>({
    resolver: yupResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  });

  React.useEffect(() => {
    clearStatus();
    return () => clearStatus();
  }, [authMode]);

  // Navigate to Resident Dashboard when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(resident)/dashboard');
    }
  }, [isAuthenticated]);

  // Reactively route to OTP screen if Phone OTP sent
  React.useEffect(() => {
    if (otpSent && submittedPhone) {
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: submittedPhone },
      });
    }
  }, [otpSent, submittedPhone]);

  // Handle Basic Auth Submit
  const onBasicSubmit = async (data: BasicAuthFormValues) => {
    await performLogin({
      login: data.login.trim(),
      password: data.password,
    });
  };

  // Handle Phone OTP Submit
  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setSubmittedPhone(data.phone);
    await requestOtp(data.phone, false);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sign In' }} />
      <KeyboardAvoidingShell className="bg-background" contentContainerClassName="p-6">
        <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full py-8">
          {/* Brand Header */}
          <View className="items-center mb-2">
            <View className="bg-primary/10 p-4 rounded-3xl mb-3">
              <ShieldCheck className="size-10 text-primary" size={36} />
            </View>
            <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Manage-My-Gate
            </Text>
            <Text className="text-muted-foreground text-sm text-center mt-1.5 px-2">
              Sign in to manage your villa, visitors, and community services
            </Text>
          </View>

          {/* Tab Switcher */}
          <SegmentedControl
            segments={[
              { key: 'basic', label: 'Password Login' },
              { key: 'phone', label: 'Phone OTP' },
            ]}
            activeSegment={authMode}
            onChange={(key) => setAuthMode(key as 'basic' | 'phone')}
          />

          {/* Form Container */}
          <View className="bg-card border border-border rounded-2xl p-5 gap-4 shadow-sm">
            {authMode === 'basic' ? (
              /* Basic Email/Username + Password Form */
              <View className="gap-4">
                <Controller
                  control={basicForm.control}
                  name="login"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email or Username"
                      placeholder="admin@example.com"
                      leftIcon={<Mail size={18} className="text-muted-foreground" />}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      autoComplete="username"
                      keyboardType="email-address"
                      error={basicForm.formState.errors.login?.message}
                    />
                  )}
                />

                <Controller
                  control={basicForm.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Password"
                      placeholder="••••••••"
                      isPassword
                      leftIcon={<Lock size={18} className="text-muted-foreground" />}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      autoComplete="password"
                      error={basicForm.formState.errors.password?.message}
                    />
                  )}
                />

                {/* Global Error Banner */}
                {error ? <ErrorBanner message={error} /> : null}

                <Button
                  onPress={basicForm.handleSubmit(onBasicSubmit)}
                  loading={loading}
                  textClassName="font-bold text-base"
                  className="mt-2 h-12 bg-primary rounded-xl"
                >
                  Sign In
                </Button>
              </View>
            ) : (
              /* Phone OTP Form */
              <View className="gap-4">
                <Controller
                  control={phoneForm.control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Mobile Number"
                      placeholder="+919988776655"
                      leftIcon={<Phone size={18} className="text-muted-foreground" />}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      error={phoneForm.formState.errors.phone?.message}
                    />
                  )}
                />

                {/* Global Error Banner */}
                {error ? <ErrorBanner message={error} /> : null}

                <Button
                  onPress={phoneForm.handleSubmit(onPhoneSubmit)}
                  loading={loading}
                  textClassName="font-bold text-base"
                  className="mt-2 h-12 bg-primary rounded-xl"
                >
                  Get OTP Code
                </Button>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingShell>
    </>
  );
}
