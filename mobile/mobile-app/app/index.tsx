import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import {
  MoonStarIcon,
  SunIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  CheckCircle2Icon,
  PowerIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '../src/features/auth/hooks/useAuth';
import { useAppSocket } from '../src/hooks/useAppSocket';
import apiClient from '../src/services/apiClient';

const SCREEN_OPTIONS = {
  title: 'Manage-My-Gate Setup',
  headerTransparent: false,
  headerRight: () => <ThemeToggle />,
};

export default function Screen() {
  const { isAuthenticated, user, loading, error, otpSent, requestOtp, verifyOtp, logout } = useAuth();
  useAppSocket(); // Establish Socket.io connection when authenticated

  const [backendStatus, setBackendStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [step, setStep] = React.useState<'phone' | 'otp'>('phone');

  // Check backend server connection on screen load
  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiClient.get('/auth/login');
        setBackendStatus('online');
      } catch (err: any) {
        if (err.response) {
          // If the server answered with any HTTP status (e.g. 404, 401), it is live and responding
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      }
    };
    checkBackend();
  }, []);

  // Update step reactively when OTP has been successfully sent
  React.useEffect(() => {
    if (otpSent) {
      setStep('otp');
    } else {
      setStep('phone');
    }
  }, [otpSent]);

  const handleSendOtp = async () => {
    if (!phoneNumber) return;
    await requestOtp(phoneNumber, false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) return;
    await verifyOtp(phoneNumber, otpCode, false);
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background p-6">
        <View className="gap-6 flex-1 justify-center max-w-md mx-auto w-full">
          {/* Header */}
          <View className="items-center mb-4">
            <Text className="text-3xl font-extrabold text-foreground tracking-tight text-center">
              Manage-My-Gate
            </Text>
            <Text className="text-muted-foreground text-sm mt-1 text-center">
              Mobile Core Infrastructure Setup
            </Text>
          </View>

          {/* Diagnostic Status Box */}
          <View className="bg-muted/40 border border-border rounded-xl p-4 gap-3">
            <Text className="font-bold text-foreground text-base">System Diagnostics</Text>

            {/* Backend Status */}
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground text-sm">Backend API Server:</Text>
              <View className="flex-row items-center gap-1.5">
                {backendStatus === 'checking' && <ActivityIndicator size="small" />}
                {backendStatus === 'online' && (
                  <>
                    <Text className="text-emerald-500 text-xs font-semibold">Online</Text>
                    <Icon as={ShieldCheckIcon} className="size-4 text-emerald-500" />
                  </>
                )}
                {backendStatus === 'offline' && (
                  <>
                    <Text className="text-rose-500 text-xs font-semibold">Offline (Check connection)</Text>
                    <Icon as={ShieldAlertIcon} className="size-4 text-rose-500" />
                  </>
                )}
              </View>
            </View>

            {/* Redux State */}
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground text-sm">Auth State:</Text>
              <Text className="text-foreground text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border">
                {isAuthenticated ? 'Authenticated' : 'Guest Mode'}
              </Text>
            </View>
          </View>

          {/* Error Message Alert */}
          {error && (
            <View className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              <Text className="text-rose-500 text-sm text-center font-medium">{error}</Text>
            </View>
          )}

          {/* Dynamic Content */}
          {isAuthenticated ? (
            <View className="bg-card border border-border rounded-xl p-5 gap-4">
              <View className="items-center gap-2">
                <Icon as={CheckCircle2Icon} className="size-12 text-emerald-500" />
                <Text className="text-lg font-bold text-foreground text-center">Welcome Back!</Text>
                <Text className="text-muted-foreground text-sm text-center">
                  Logged in as: {user?.email || 'User'}
                </Text>
                {user?.role && (
                  <Text className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">
                    Role: {user.role}
                  </Text>
                )}
              </View>

              <Button onPress={logout} variant="destructive" className="mt-2 flex-row gap-2 items-center justify-center">
                <Icon as={PowerIcon} className="size-4 text-destructive-foreground" />
                <Text>Sign Out</Text>
              </Button>
            </View>
          ) : (
            <View className="bg-card border border-border rounded-xl p-5 gap-4">
              <Text className="font-bold text-foreground text-lg mb-1">Resident / Guard Login</Text>

              {step === 'phone' ? (
                <View className="gap-3">
                  <Text className="text-muted-foreground text-xs font-medium">Enter your mobile number to receive an OTP</Text>
                  <TextInput
                    placeholder="Mobile Number (e.g. +919988776655)"
                    placeholderTextColor="#888"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    className="bg-muted/50 text-foreground border border-border rounded-lg px-3.5 py-2.5 text-sm"
                  />
                  <Button onPress={handleSendOtp} disabled={loading} className="mt-1">
                    {loading ? <ActivityIndicator color="#fff" /> : <Text>Request OTP Code</Text>}
                  </Button>
                </View>
              ) : (
                <View className="gap-3">
                  <Text className="text-muted-foreground text-xs font-medium">Enter the code sent to {phoneNumber}</Text>
                  <TextInput
                    placeholder="OTP Code"
                    placeholderTextColor="#888"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    className="bg-muted/50 text-foreground border border-border rounded-lg px-3.5 py-2.5 text-sm"
                  />
                  <Button onPress={handleVerifyOtp} disabled={loading} className="mt-1">
                    {loading ? <ActivityIndicator color="#fff" /> : <Text>Verify & Log In</Text>}
                  </Button>
                  <Button onPress={() => setStep('phone')} variant="ghost" className="mt-1">
                    <Text className="text-muted-foreground text-xs">Back to Phone Number</Text>
                  </Button>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button
      onPressIn={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full web:mx-4">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5 text-foreground" />
    </Button>
  );
}
