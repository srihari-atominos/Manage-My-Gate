import { Stack } from 'expo-router';

export default function AmenitiesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="discover" />
      <Stack.Screen name="admin-calendar" />
      <Stack.Screen name="admin-master" />
      <Stack.Screen name="ledgers" />
      <Stack.Screen name="maintenance" />
      <Stack.Screen name="my-bookings" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="security-logs" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}
