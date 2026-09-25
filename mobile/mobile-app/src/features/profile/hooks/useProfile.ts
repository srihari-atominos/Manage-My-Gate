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
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  // Role and Persona Scoping
  const roleLower = useMemo(() => {
    return ((user?.role || (Array.isArray(userAny?.roles) ? userAny?.roles[0] : '') || '') as string).toLowerCase();
  }, [user, userAny]);

  const isResidentRole = useMemo(() => /resident|tenant|owner|family/i.test(roleLower), [roleLower]);
  const isSecurity = useMemo(() => /guard|security/i.test(roleLower), [roleLower]);
  const isFacility = useMemo(() => /facility|amenity|staff|maintenance/i.test(roleLower), [roleLower]);

  // Derived user details
  const dynamicUnit = useMemo(() => {
    if (!isResidentRole) return '';
    return (
      userAny?.villaNumber ||
      userAny?.activeVillaNumber ||
      userAny?.unitNumber ||
      ''
    );
  }, [isResidentRole, userAny]);

  const dynamicCommunity = useMemo(() => {
    return (
      userAny?.organizationName ||
      userAny?.activeOrganizationName ||
      userAny?.orgName ||
      userAny?.communityName ||
      'Community Workspace'
    );
  }, [userAny]);

  const dynamicRole = useMemo(() => {
    return user?.role || (userAny?.roles && userAny.roles[0]) || 'Member';
  }, [user, userAny]);

  const workspaces = useMemo(() => {
    return (userAny?.availableWorkspaces || []) as any[];
  }, [userAny]);

  const hasMultipleOrgs = useMemo(() => {
    return Array.isArray(workspaces) && workspaces.length > 1;
  }, [workspaces]);

  const activeOrgId = userAny?.activeOrgId || userAny?.orgId;

  const currentWorkspace = useMemo(() => {
    if (!Array.isArray(workspaces)) return null;
    return workspaces.find((w: any) => {
      const wId = w.orgId || w._id || w.id;
      return activeOrgId && wId ? wId.toString() === activeOrgId.toString() : false;
    });
  }, [workspaces, activeOrgId]);

  const userRoles = useMemo(() => {
    if (currentWorkspace?.roles && Array.isArray(currentWorkspace.roles) && currentWorkspace.roles.length > 0) {
      return Array.from(new Set(currentWorkspace.roles.filter((r: any): r is string => Boolean(r && typeof r === 'string'))));
    }
    if (userAny?.roles && Array.isArray(userAny.roles) && userAny.orgId === activeOrgId) {
      return Array.from(new Set(userAny.roles.filter((r: any): r is string => Boolean(r && typeof r === 'string'))));
    }
    return user?.role ? [user.role] : [];
  }, [currentWorkspace, userAny, activeOrgId, user?.role]);

  const hasMultipleRoles = useMemo(() => {
    return userRoles.length > 1;
  }, [userRoles]);

  const accessibleUnits = useMemo(() => {
    if (!isResidentRole) return [];
    const unitsMap = new Map<string, any>();
    const activeOrgId = userAny?.orgId || userAny?.activeOrgId;

    if (userAny?.accessibleUnits && Array.isArray(userAny.accessibleUnits)) {
      userAny.accessibleUnits.forEach((u: any, idx: number) => {
        const uOrg = u.orgId || u.organizationId;
        if (activeOrgId && uOrg && uOrg !== activeOrgId) return;
        const uId = u.villaId || u.id || String(idx + 1);
        const uNum = u.villaNumber || u.unitNumber;
        if (uNum) {
          unitsMap.set(uId, {
            id: uId,
            unitNumber: uNum,
            block: u.block || u.villaBlock || '',
            residencyType: u.residentType || u.residencyType || 'Resident',
          });
        }
      });
    }

    if (Array.isArray(workspaces)) {
      workspaces.forEach((w: any, idx: number) => {
        const matchesOrg = !activeOrgId || w.orgId === activeOrgId || w._id === activeOrgId;
        const wsHasResident =
          (w.roles && Array.isArray(w.roles) && w.roles.some((r: string) => /resident|tenant|owner|family/i.test(r))) ||
          /resident|tenant|owner|family/i.test(w.roleName || '');
        if (matchesOrg && wsHasResident && (w.villaId || w.unitId || w.villaNumber || w.unitNumber)) {
          const uId = w.villaId || w.unitId || `ws-unit-${idx}`;
          const uNum = w.villaNumber || w.unitNumber;
          if (uNum && !unitsMap.has(uId)) {
            unitsMap.set(uId, {
              id: uId,
              unitNumber: uNum,
              block: w.block || w.villaBlock || '',
              residencyType: w.residentType || 'Resident',
            });
          }
        }
      });
    }

    return Array.from(unitsMap.values());
  }, [isResidentRole, userAny, workspaces]);

  const hasMultipleUnits = useMemo(() => {
    return isResidentRole && accessibleUnits.length > 1;
  }, [isResidentRole, accessibleUnits]);

  const availableAssignments = useMemo(() => {
    const list = userAny?.availableAssignments || userAny?.accessibleAssignments;
    return Array.isArray(list) ? list : [];
  }, [userAny]);

  const hasMultipleAssignments = useMemo(() => {
    return (isSecurity || isFacility) && availableAssignments.length > 1;
  }, [isSecurity, isFacility, availableAssignments]);

  const dynamicAssignment = useMemo(() => {
    if (userAny?.activeAssignment?.name) {
      return userAny.activeAssignment.name;
    }
    if (userAny?.assignedGate) {
      return userAny.assignedGate;
    }
    if (userAny?.assignedFacility) {
      return userAny.assignedFacility;
    }
    return null;
  }, [userAny]);

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
    dynamicAssignment,
    isResidentRole,
    isSecurity,
    isFacility,
    workspaces,
    hasMultipleOrgs,
    userRoles,
    hasMultipleRoles,
    accessibleUnits,
    hasMultipleUnits,
    availableAssignments,
    hasMultipleAssignments,
    emergencyContact,
    saving,
    successMessage,
    villaModalOpen,
    orgModalOpen,
    roleModalOpen,
    assignmentModalOpen,
    setVillaModalOpen,
    setOrgModalOpen,
    setRoleModalOpen,
    setAssignmentModalOpen,
    updateEmergencyContact: handleUpdateEmergencyContact,
    logout: handleLogout,
  };
};

export default useProfile;
