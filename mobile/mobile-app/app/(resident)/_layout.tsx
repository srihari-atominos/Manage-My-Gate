import { Stack } from 'expo-router';

export default function ResidentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="showcase" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="amenities" />
      <Stack.Screen name="billing" />
      <Stack.Screen name="complaints" />
      <Stack.Screen name="notices" />
      <Stack.Screen name="visitor" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="directory/index" />
      <Stack.Screen name="directory/conversation/[id]" />
      <Stack.Screen name="notes/index" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}

