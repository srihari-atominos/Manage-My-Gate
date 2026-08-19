import { Stack } from 'expo-router';

export default function NoticesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="active-board" />
      <Stack.Screen name="manage" />
      <Stack.Screen name="polls" />
    </Stack>
  );
}
