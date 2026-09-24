import { Stack } from 'expo-router';

export default function NoticesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="manage" />
      <Stack.Screen name="create" />
      <Stack.Screen name="active-board" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="polls" />
    </Stack>
  );
}
