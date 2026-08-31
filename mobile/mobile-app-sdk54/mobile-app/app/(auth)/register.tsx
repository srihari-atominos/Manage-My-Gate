import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { Stack, router, useSegments, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, Mail, Lock, Phone, User } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { KeyboardAvoidingShell } from '@/components/layout/KeyboardAvoidingShell';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { GoogleSignInButton } from '../../src/features/auth/components/GoogleSignInButton';
import { MicrosoftSignInButton } from '../../src/features/auth/components/MicrosoftSignInButton';

// Registration Validation Schema
const registerSchema = yup.object().shape({
  name: yup.string().required('Full Name is required'),
  email: yup.string().required('Email is required').email('Invalid email address'),
  phone: yup
    .string()
    .required('Phone number is required')
    .test('valid-phone', 'Invalid phone number format', function (value) {
      if (!value) return false;
      if (value.startsWith('+91')) {
        const nationalNumber = value.slice(3);
        if (nationalNumber.length !== 10) {
          return this.createError({ message: 'India mobile number must be exactly 10 digits' });
        }
        if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
          return this.createError({ message: 'India mobile number must start with 6, 7, 8, or 9' });
        }
        return true;
      }
      return /^\+[1-9]\d{7,14}$/.test(value);
    }),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: yup
    .string()
    .required('Please repeat your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});

type RegisterFormValues = yup.InferType<typeof registerSchema>;

export default function RegisterScreen() {
  const { register: performRegister, loading, error, successMsg, clearStatus } = useAuth();
  const params = useLocalSearchParams<{ email?: string; name?: string; isGoogleSso?: string }>();
  
  const segments = useSegments();
  const isFocused = segments[segments.length - 1] === 'register';

  const form = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: params.name || '',
      email: params.email || '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (params.name) {
      form.setValue('name', params.name);
    }
    if (params.email) {
      form.setValue('email', params.email);
    }
  }, [params.name, params.email]);

  React.useEffect(() => {
    clearStatus();
    return () => clearStatus();
  }, []);

  // Reactively route to OTP verification screen if registration succeeds (successMsg implies OTP was sent)
  React.useEffect(() => {
    if (isFocused && successMsg && successMsg.toLowerCase().includes('otp')) {
      const email = form.getValues('email');
      router.push({
        pathname: '/(auth)/register-otp',
        params: { email },
      });
    }
  }, [successMsg, isFocused]);

  const onSubmit = async (data: RegisterFormValues) => {
    const emailPrefix = data.email
      .trim()
      .split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, '');
    
    let derivedUsername = emailPrefix;
    if (derivedUsername.length < 3) {
      derivedUsername = 'user' + Math.floor(100 + Math.random() * 900);
    } else if (derivedUsername.length > 30) {
      derivedUsername = derivedUsername.substring(0, 30);
    }

    await performRegister({
      name: data.name.trim(),
      username: derivedUsername,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim().startsWith('+') ? data.phone.trim() : `+${data.phone.trim()}`,
      password: data.password,
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create Account', headerBackVisible: true }} />
      <KeyboardAvoidingShell className="bg-background">
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
          <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full py-4">
            {/* Brand Header */}
            <View className="items-center mb-2">
              <View className="bg-primary/10 p-4 rounded-3xl mb-3">
                <ShieldCheck className="size-10 text-primary" size={36} />
              </View>
              <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
                Register
              </Text>
              <Text className="text-muted-foreground text-sm text-center mt-1.5 px-2">
                Create your enterprise account to manage your workspace
              </Text>
            </View>

            {/* Form Container */}
            <View className="bg-card border border-border rounded-2xl p-5 gap-4 shadow-sm">
              <View className="gap-4">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Full Name"
                      placeholder="John Doe"
                      leftIcon={<User size={18} className="text-muted-foreground" />}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="words"
                      error={form.formState.errors.name?.message}
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email"
                      placeholder="admin@example.com"
                      leftIcon={<Mail size={18} className="text-muted-foreground" />}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      error={form.formState.errors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field: { onChange, value } }) => (
                    <PhoneInput
                      label="Mobile Number"
                      placeholder="99887 76655"
                      onChangeText={onChange}
                      value={value}
                      error={form.formState.errors.phone?.message}
                    />
                  )}
                />

                <Controller
                  control={form.control}
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
                      autoComplete="new-password"
                      error={form.formState.errors.password?.message}
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Repeat Password"
                      placeholder="••••••••"
                      isPassword
                      leftIcon={<Lock size={18} className="text-muted-foreground" />}
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
                {error ? <ErrorBanner message={error} /> : null}

                <Button
                  onPress={form.handleSubmit(onSubmit)}
                  loading={loading}
                  textClassName="font-bold text-base"
                  className="mt-2 h-12 bg-primary rounded-xl"
                >
                  Create Account
                </Button>
              </View>

              {/* SSO Separator */}
              <View className="flex-row items-center mt-2 mb-1">
                <View className="flex-1 h-px bg-border" />
                <Text className="mx-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">OR CONTINUE WITH</Text>
                <View className="flex-1 h-px bg-border" />
              </View>

              <View className="flex-row gap-3 mt-2">
                <View className="flex-1">
                  <GoogleSignInButton />
                </View>
                <View className="flex-1">
                  <MicrosoftSignInButton />
                </View>
              </View>

              {/* Login Link */}
              <View className="items-center mt-4">
                <Button variant="link" onPress={() => router.push('/(auth)/login')}>
                  <Text className="text-primary font-medium text-sm">
                    Already have an account? Sign In
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
