import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="billing" />
      <Stack.Screen name="audit-logs" />
      <Stack.Screen name="integrations" />
      <Stack.Screen name="role-builder" />
      <Stack.Screen name="users" />
      <Stack.Screen name="villas" />
      <Stack.Screen name="workspace-settings" />
    </Stack>
  );
}
