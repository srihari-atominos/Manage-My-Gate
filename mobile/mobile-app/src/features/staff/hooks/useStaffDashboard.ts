import { useEffect, useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchMyProfileThunk,
  fetchMyAttendanceThunk,
  fetchMyAllocationsThunk,
  acceptAssociationThunk,
  rejectAssociationThunk,
  resetStaffState,
  setCurrentOrgId,
} from '../store/staffSlice';
import { performLogout } from '../../auth/store/authSlice';
import { selectAuthUser } from '../../auth/store/authSelectors';
import { checkIsAdmin } from '../../../utils/rbac';
import { router } from 'expo-router';

export const useStaffDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector(selectAuthUser) as any;
  const {
    myProfile,
    isProfileLoading,
    profileError,
    currentOrgId,
    myAllocations,
    isAllocationsLoading,
    myAttendanceRecords,
    isMyAttendanceLoading,
    myAttendanceError,
  } = useSelector((state: RootState) => state.staff);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Active organization resolution
  const activeOrgId = useMemo(() => {
    return (
      currentUser?.activeOrganizationId ||
      currentUser?.orgId ||
      (Array.isArray(currentUser?.organizations) && currentUser?.organizations[0]?._id) ||
      null
    );
  }, [currentUser]);

  // RBAC verification: staff:view_own, staff:view, staff:manage or admin
  const isAdmin = useMemo(() => checkIsAdmin(currentUser), [currentUser]);

  const permissions = useMemo(() => currentUser?.permissions || [], [currentUser?.permissions]);

  // Check if role is Dual Scope (STAFF roleScope) or Admin or Staff Role Archetype
  const isDualStaff = useMemo(() => {
    if (isAdmin) return true;
    const roleObj = currentUser?.role;
    const roleScope =
      (typeof roleObj === 'object' && roleObj?.roleScope) ||
      currentUser?.roleScope ||
      currentUser?.activeRoleObj?.roleScope;

    // Strict Role Builder Scope: If explicitly defined as STAFF, it is Dual Scope
    if (roleScope === 'STAFF') return true;

    // Check role name heuristic for common staff archetypes (technician, maid, guard, maintenance, etc.)
    const roleName = typeof roleObj === 'string' ? roleObj : (roleObj?.name || currentUser?.roleName || '');
    const isStaffRoleName = /staff|guard|security|technician|maintenance|vendor|maid|driver|cook|gardener/i.test(roleName);
    if (isStaffRoleName) return true;

    // If explicitly marked as GLOBAL, it operates in dual scope if user has explicit staff capabilities
    if (roleScope === 'GLOBAL') {
      return (
        permissions.includes('complaints:assignee') ||
        permissions.includes('staff:attendance') ||
        permissions.includes('staff:assign_unit') ||
        permissions.includes('staff:view_own')
      );
    }

    // Fallback: If user has complaints, attendance, or unit assignment permissions, they operate in dual scope
    if (
      permissions.includes('complaints:assignee') ||
      permissions.includes('staff:attendance') ||
      permissions.includes('staff:assign_unit') ||
      permissions.includes('staff:view_own')
    ) {
      return true;
    }
    return false;
  }, [isAdmin, currentUser, permissions]);

  // Granular capability flags based on permissions & scope
  const canViewWorkOrders = useMemo(() => {
    if (isAdmin) return true;
    return (
      isDualStaff ||
      permissions.includes('complaints:assignee') ||
      permissions.includes('complaints:update') ||
      permissions.includes('complaints') ||
      permissions.includes('*')
    );
  }, [isAdmin, isDualStaff, permissions]);

  const canViewAttendance = useMemo(() => {
    if (isAdmin) return true;
    return (
      isDualStaff ||
      permissions.includes('staff:attendance') ||
      permissions.includes('staff.attendance') ||
      permissions.includes('staff:manage') ||
      permissions.includes('*')
    );
  }, [isAdmin, isDualStaff, permissions]);

  const canViewAllocations = useMemo(() => {
    if (isAdmin) return true;
    return (
      isDualStaff ||
      permissions.includes('staff:assign_unit') ||
      permissions.includes('staff.assign_unit') ||
      permissions.includes('staff:manage') ||
      permissions.includes('*')
    );
  }, [isAdmin, isDualStaff, permissions]);

  const hasStaffAccess = useMemo(() => {
    if (isAdmin) return true;
    return (
      permissions.includes('staff:view_own') ||
      permissions.includes('staff.view_own') ||
      permissions.includes('staff:portal') ||
      permissions.includes('staff:view') ||
      permissions.includes('staff:manage') ||
      permissions.includes('staff.view') ||
      permissions.includes('staff.manage') ||
      permissions.includes('staff') ||
      permissions.includes('*') ||
      permissions.includes('platform:super_admin') ||
      isDualStaff
    );
  }, [permissions, isAdmin, isDualStaff]);

  // Auto-fetch profile, allocations, and attendance based on capability permissions
  useEffect(() => {
    if (!hasStaffAccess) return;

    if (activeOrgId && activeOrgId !== currentOrgId) {
      dispatch(resetStaffState());
      dispatch(setCurrentOrgId(activeOrgId));
      dispatch(fetchMyProfileThunk());
      if (canViewAllocations) {
        dispatch(fetchMyAllocationsThunk());
      }
      if (canViewAttendance) {
        dispatch(fetchMyAttendanceThunk());
      }
    } else if (!myProfile && !isProfileLoading && !profileError) {
      if (activeOrgId) {
        dispatch(setCurrentOrgId(activeOrgId));
      }
      dispatch(fetchMyProfileThunk());
      if (canViewAllocations) {
        dispatch(fetchMyAllocationsThunk());
      }
      if (canViewAttendance) {
        dispatch(fetchMyAttendanceThunk());
      }
    }
  }, [
    hasStaffAccess,
    canViewAllocations,
    canViewAttendance,
    activeOrgId,
    currentOrgId,
    myProfile,
    isProfileLoading,
    profileError,
    dispatch,
  ]);

  const refreshProfile = useCallback(() => {
    if (hasStaffAccess) {
      dispatch(fetchMyProfileThunk());
      if (canViewAllocations) {
        dispatch(fetchMyAllocationsThunk());
      }
      if (canViewAttendance) {
        dispatch(fetchMyAttendanceThunk());
      }
    }
  }, [hasStaffAccess, canViewAllocations, canViewAttendance, dispatch]);

  const handleAcceptAllocation = useCallback(
    async (associationId: string) => {
      return await dispatch(acceptAssociationThunk(associationId)).unwrap();
    },
    [dispatch]
  );

  const handleRejectAllocation = useCallback(
    async (associationId: string, reason?: string) => {
      return await dispatch(rejectAssociationThunk({ id: associationId, reason })).unwrap();
    },
    [dispatch]
  );

  const confirmLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const cancelLogout = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  const executeLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    dispatch(resetStaffState());
    await dispatch(performLogout());
    router.replace('/(auth)/login');
  }, [dispatch]);

  const activeAllocations = useMemo(() => {
    return (myAllocations || []).filter((a) => a.status === 'Active');
  }, [myAllocations]);

  const pendingAllocations = useMemo(() => {
    return (myAllocations || []).filter((a) => a.status === 'Pending');
  }, [myAllocations]);

  return {
    currentUser,
    myProfile,
    isLoading: isProfileLoading,
    error: profileError,
    activeOrgId,
    isAdmin,
    hasStaffAccess,
    isDualStaff,
    canViewWorkOrders,
    canViewAttendance,
    canViewAllocations,
    myAllocations,
    activeAllocations,
    pendingAllocations,
    isAllocationsLoading,
    handleAcceptAllocation,
    handleRejectAllocation,
    myAttendanceRecords,
    isAttendanceLoading: isMyAttendanceLoading,
    attendanceError: myAttendanceError,
    showLogoutConfirm,
    refreshProfile,
    confirmLogout,
    cancelLogout,
    executeLogout,
  };
};

export default useStaffDashboard;
