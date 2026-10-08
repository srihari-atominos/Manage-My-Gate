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
      <Stack.Screen name="accept-invite" options={{ title: 'Invitation', headerShown: false }} />
      <Stack.Screen name="pending-invitations" options={{ title: 'Your Invitations', headerShown: false }} />
      <Stack.Screen name="no-community" options={{ headerShown: false }} />
    </Stack>
  );
}
