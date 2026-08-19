import { Stack } from 'expo-router';

export default function BillingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="my-dues" />
      <Stack.Screen name="ledger" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="payment-result" />
      <Stack.Screen name="invoice/[id]" />
    </Stack>
  );
}
