import { Redirect, Stack } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectActiveOrgId, selectAuthUser } from '@/src/features/auth/store/authSelectors';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';

export default function ExpenseManagerLayout() {
  const user = useSelector(selectAuthUser);
  const activeOrgId = useSelector(selectActiveOrgId);
  const allowed = isFeatureAllowedForUser({ id: 'personal_expense_manager' }, user);
  if (user && !allowed) return <Redirect href="/(resident)/dashboard" />;
  // Remount feature screens on an organization switch; the API client also rejects stale tenant responses.
  return <Stack key={activeOrgId || 'no-organization'} screenOptions={{ headerShown: false }} />;
}