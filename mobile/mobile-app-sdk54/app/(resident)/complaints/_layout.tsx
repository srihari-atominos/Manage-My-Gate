import { Stack } from 'expo-router';

export default function ComplaintsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="my-tickets" />
      <Stack.Screen name="raise-ticket" />
      <Stack.Screen name="manage" />
      <Stack.Screen name="assignee" />
      <Stack.Screen name="staff" />
    </Stack>
  );
}
