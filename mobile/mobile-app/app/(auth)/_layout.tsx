import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: false,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Resident Login' }} />
      <Stack.Screen name="signup" options={{ title: 'Resident Registration' }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      <Stack.Screen name="otp" options={{ title: 'Verify Identity' }} />
      <Stack.Screen name="register-otp" options={{ title: 'Verify Registration' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password', headerShown: false }} />
      <Stack.Screen name="accept-invite" options={{ title: 'Accept Workspace Invitation', headerBackVisible: true }} />
      <Stack.Screen name="setup-organization" options={{ title: 'Organization Setup', headerBackVisible: false }} />
      <Stack.Screen name="select-features" options={{ title: 'Configure Features', headerBackVisible: false }} />
    </Stack>
  );
}
