import { Stack } from 'expo-router';

export default function VisitorAdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="blacklist" />
      <Stack.Screen name="community-passes" />
      <Stack.Screen name="create-pass" />
      <Stack.Screen name="walk-in-console" />
    </Stack>
  );
}
