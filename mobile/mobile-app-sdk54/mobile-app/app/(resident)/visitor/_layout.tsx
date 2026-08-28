import { Stack } from 'expo-router';

export default function VisitorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="admin-logs" />
      <Stack.Screen name="cab-pass" />
      <Stack.Screen name="delivery-pass" />
      <Stack.Screen name="gate-console" />
      <Stack.Screen name="history" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="kid-exit" />
      <Stack.Screen name="resident-passes" />
      <Stack.Screen name="staff-pass" />
      <Stack.Screen name="walk-ins" />
    </Stack>
  );
}
