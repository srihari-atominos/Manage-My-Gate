import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useRouter } from 'expo-router';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export const useProfile = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const userAny = user as any;

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Emergency contact state
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: userAny?.emergencyContactName || 'Fatima Al-Mansoor',
    phone: userAny?.emergencyContactPhone || '+971 50 987 6543',
    relationship: userAny?.emergencyRelationship || 'Spouse',
  });

  // Modals state
  const [villaModalOpen, setVillaModalOpen] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  // Derived user details
  const dynamicUnit = useMemo(() => {
    return (
      userAny?.villaNumber ||
      userAny?.activeVillaNumber ||
      userAny?.unitNumber ||
      'Villa A-104'
    );
  }, [userAny]);

  const dynamicCommunity = useMemo(() => {
    return (
      userAny?.organizationName ||
      userAny?.activeOrganizationName ||
      userAny?.orgName ||
      userAny?.communityName ||
      'Green Meadows Resort & Community'
    );
  }, [userAny]);

  const dynamicRole = useMemo(() => {
    return user?.role || (userAny?.roles && userAny.roles[0]) || 'Resident Owner';
  }, [user, userAny]);

  const handleUpdateEmergencyContact = useCallback(
    async (contact: Partial<EmergencyContact>) => {
      setSaving(true);
      setSuccessMessage(null);
      try {
        // Simulate thunk / mutation update
        setEmergencyContact((prev) => ({ ...prev, ...contact }));
        setSuccessMessage('Emergency contact updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  }, [logout, router]);

  return {
    user,
    dynamicUnit,
    dynamicCommunity,
    dynamicRole,
    emergencyContact,
    saving,
    successMessage,
    villaModalOpen,
    orgModalOpen,
    roleModalOpen,
    setVillaModalOpen,
    setOrgModalOpen,
    setRoleModalOpen,
    updateEmergencyContact: handleUpdateEmergencyContact,
    logout: handleLogout,
  };
};

export default useProfile;
