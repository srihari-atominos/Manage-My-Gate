import { Stack } from 'expo-router';

export default function AdminBillingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="assessments" />
      <Stack.Screen name="ledger" />
    </Stack>
  );
}
