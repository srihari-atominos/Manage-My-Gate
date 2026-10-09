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
      {/* One sign-in for everyone: email or phone code, or SSO. Access is by invitation. */}
      <Stack.Screen name="login" options={{ title: 'Sign In', headerShown: false }} />
      <Stack.Screen name="otp" options={{ title: 'Verify Identity' }} />
    </Stack>
  );
}

