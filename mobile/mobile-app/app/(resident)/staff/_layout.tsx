import { Stack } from 'expo-router';
import { premiumScreenTransition } from '@/src/utils/screenTransitions';

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...premiumScreenTransition }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="my-staff" />
    </Stack>
  );
}
