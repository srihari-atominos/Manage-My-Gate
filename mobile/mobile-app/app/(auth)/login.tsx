<<<<<<< HEAD
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Stack, router } from 'expo-router';
import { ShieldCheck, Mail, Lock, Phone } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background p-6">
        <View className="gap-6 flex-1 justify-center max-w-sm mx-auto w-full py-8">
          {/* Brand Header */}
          <View className="items-center mb-2">
            <View className="bg-primary/10 p-4 rounded-3xl mb-3">
              <ShieldCheck className="size-10 text-primary" color="#03A9F4" size={36} />
            </View>
            <Text className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Manage-My-Gate
            </Text>
            <Text className="text-muted-foreground text-sm text-center mt-1.5 px-2">
              Sign in to manage your villa, visitors, and community services
            </Text>
          </View>

          {/* Tab Switcher */}
          <View className="bg-muted/60 p-1 rounded-xl flex-row border border-border">
            <TouchableOpacity
              onPress={() => setAuthMode('basic')}
              activeOpacity={0.8}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                authMode === 'basic' ? 'bg-card shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  authMode === 'basic' ? 'text-primary font-extrabold' : 'text-muted-foreground'
                }`}
              >
                Password Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode('phone')}
              activeOpacity={0.8}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                authMode === 'phone' ? 'bg-card shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  authMode === 'phone' ? 'text-primary font-extrabold' : 'text-muted-foreground'
                }`}
              >
                Phone OTP
              </Text>
            </TouchableOpacity>
          </View>

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
                      leftIcon={<Mail size={18} color="#888" />}
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
                      leftIcon={<Lock size={18} color="#888" />}
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
                {error ? (
                  <View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                    <Text className="text-rose-500 text-xs text-center font-medium">{error}</Text>
                  </View>
                ) : null}

                <Button
                  onPress={basicForm.handleSubmit(onBasicSubmit)}
                  disabled={loading}
                  className="mt-2 h-12 bg-primary rounded-xl"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-bold text-primary-foreground text-base">Sign In</Text>
                  )}
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
                      leftIcon={<Phone size={18} color="#888" />}
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
                {error ? (
                  <View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                    <Text className="text-rose-500 text-xs text-center font-medium">{error}</Text>
                  </View>
                ) : null}

                <Button
                  onPress={phoneForm.handleSubmit(onPhoneSubmit)}
                  disabled={loading}
                  className="mt-2 h-12 bg-primary rounded-xl"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-bold text-primary-foreground text-base">Get OTP Code</Text>
                  )}
                </Button>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </>
=======
import React, { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '../../components/layout/SafeAreaWrapper';
import { KeyboardAvoidingShell } from '../../components/layout/KeyboardAvoidingShell';
import { Typography } from '../../components/layout/Typography';
import { TextInput } from '../../components/forms/TextInput';
import { PasswordInput } from '../../components/forms/PasswordInput';
import { Button } from '../../components/ui/button';
import { SectionDivider } from '../../components/layout/SectionDivider';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { updateTokenAndUser, loginUser, requestOtp as requestOtpThunk } from '../../src/features/auth/store/authSlice';
import { Lock, Mail, Phone, UserCheck, Shield } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { login, requestOtp, isAuthenticated, loading, error, clearStatus } = useAuth();

  const [authMode, setAuthMode] = useState<'password' | 'phone'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    clearStatus();
  }, [clearStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(resident)' as any);
    }
  }, [isAuthenticated, router]);

  const handlePasswordLogin = async () => {
    if (!email || !password) return;
    const result = await login({ email, password });
    if (loginUser.fulfilled.match(result)) {
      router.replace('/(resident)' as any);
    }
  };

  const handlePhoneOtpRequest = async () => {
    if (!phone) return;
    const result = await requestOtp(phone, false);
    if (requestOtpThunk.fulfilled.match(result)) {
      router.push({ pathname: '/(auth)/otp', params: { phone } } as any);
    }
  };

  // Demo Quick Login for Instant Development Testing
  const handleQuickDemoLogin = (role: 'resident' | 'guard') => {
    const demoToken = `demo_jwt_token_${role}_${Date.now()}`;
    const demoUser = {
      id: role === 'resident' ? 'demo_resident_1' : 'demo_guard_1',
      _id: role === 'resident' ? 'demo_resident_1' : 'demo_guard_1',
      email: role === 'resident' ? 'resident@gate.com' : 'guard@gate.com',
      name: role === 'resident' ? 'Ahmed Al-Mansoor (Demo Owner)' : 'Officer Salem (Gate Guard)',
      role: role === 'resident' ? 'Resident' : 'SecurityGuard',
      orgId: 'demo_community_1',
      permissions: ['billing:read', 'billing:pay', 'visitor:manage'],
    };

    dispatch(updateTokenAndUser({ token: demoToken, user: demoUser }));
    router.replace(role === 'resident' ? ('/(resident)' as any) : ('/(visitor)' as any));
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingShell contentContainerClassName="p-6 justify-center">
        {/* App Logo & Header */}
        <View className="mb-8 items-center">
          <View className="h-16 w-16 mb-3 rounded-2xl bg-primary items-center justify-center shadow-lg">
            <Typography variant="h3" color="inverse" weight="bold">
              G
            </Typography>
          </View>
          <Typography variant="h2" weight="bold">
            Manage My Gate
          </Typography>
          <Typography variant="body1" color="secondary" className="text-center mt-1">
            Community Access & Financial Operations
          </Typography>
        </View>

        {/* Tab Switcher: Email/Password vs Phone OTP */}
        <View className="flex-row rounded-xl bg-muted p-1 mb-6 border border-border">
          <Pressable
            className={`flex-1 py-2.5 rounded-lg items-center ${
              authMode === 'password' ? 'bg-card shadow-sm' : ''
            }`}
            onPress={() => {
              setAuthMode('password');
              clearStatus();
            }}
          >
            <Typography
              variant="body2"
              weight={authMode === 'password' ? 'bold' : 'regular'}
              color={authMode === 'password' ? 'primary' : 'secondary'}
            >
              Password Login
            </Typography>
          </Pressable>
          <Pressable
            className={`flex-1 py-2.5 rounded-lg items-center ${
              authMode === 'phone' ? 'bg-card shadow-sm' : ''
            }`}
            onPress={() => {
              setAuthMode('phone');
              clearStatus();
            }}
          >
            <Typography
              variant="body2"
              weight={authMode === 'phone' ? 'bold' : 'regular'}
              color={authMode === 'phone' ? 'primary' : 'secondary'}
            >
              Phone OTP
            </Typography>
          </Pressable>
        </View>

        {/* Error Alert Banner */}
        {error && (
          <View className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4">
            <Typography variant="caption" color="error" className="text-center font-medium">
              {error}
            </Typography>
          </View>
        )}

        {/* Password Login Form */}
        {authMode === 'password' ? (
          <View className="gap-4 mb-6">
            <TextInput
              label="Email Address"
              placeholder="resident@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={Mail}
            />
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              leftIcon={Lock}
            />

            <Button
              onPress={handlePasswordLogin}
              disabled={loading || !email || !password}
              className="w-full mt-2 py-4"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Typography weight="bold" color="inverse">
                  Sign In
                </Typography>
              )}
            </Button>
          </View>
        ) : (
          /* Phone OTP Login Form */
          <View className="gap-4 mb-6">
            <TextInput
              label="Mobile Number"
              placeholder="+91 99887 76655"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={Phone}
            />

            <Button
              onPress={handlePhoneOtpRequest}
              disabled={loading || !phone}
              className="w-full mt-2 py-4"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Typography weight="bold" color="inverse">
                  Send OTP Code
                </Typography>
              )}
            </Button>
          </View>
        )}

        <SectionDivider label="QUICK DEMO ACCESS" />

        {/* Quick Demo Login Triggers */}
        <View className="mt-4 gap-3">
          <Button
            variant="outline"
            onPress={() => handleQuickDemoLogin('resident')}
            className="w-full flex-row items-center justify-center gap-2 py-3"
          >
            <UserCheck size={18} className="text-foreground me-2" />
            <Typography weight="bold">Demo Resident Mode</Typography>
          </Button>

          <Button
            variant="outline"
            onPress={() => handleQuickDemoLogin('guard')}
            className="w-full flex-row items-center justify-center gap-2 py-3 border-border"
          >
            <Shield size={18} className="text-foreground me-2" />
            <Typography weight="bold" color="secondary">
              Demo Guard Mode
            </Typography>
          </Button>
        </View>
      </KeyboardAvoidingShell>
    </SafeAreaWrapper>
>>>>>>> mobile-frontend/visitor-management
  );
}


