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
      <Stack.Screen name="otp" options={{ title: 'Verify Identity' }} />
    </Stack>
  );
}
