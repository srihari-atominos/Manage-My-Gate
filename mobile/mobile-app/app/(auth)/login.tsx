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
  );
}


