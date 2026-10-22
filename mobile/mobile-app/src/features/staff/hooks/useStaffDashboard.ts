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
    isProfileFetched,
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

  // The linked staff profile is the source of truth for portal sections. Permissions can grant
  // access to the portal, but must not turn a community-only or unit-only staff role into dual scope.
  const staffScope = useMemo<'COMMUNITY' | 'UNIT' | null>(() => {
    if (!myProfile) return null;
    return myProfile.staffCategory === 'UNIT' ? 'UNIT' : 'COMMUNITY';
  }, [myProfile]);

  const isUnitStaff = staffScope === 'UNIT';
  const isCommunityOnlyStaff = staffScope === 'COMMUNITY' && myProfile?.communityOnly === true;
  const isDualStaff = staffScope === 'COMMUNITY' && !isCommunityOnlyStaff;

  const canViewWorkOrders = useMemo(() => {
    if (isAdmin) return true;
    if (staffScope) return staffScope === 'COMMUNITY';
    return false;
  }, [isAdmin, staffScope]);

  const canViewAttendance = useMemo(() => {
    if (isAdmin) return true;
    // Every linked staff member needs their QR pass and personal attendance history.
    return Boolean(staffScope);
  }, [isAdmin, staffScope]);

  const canViewAllocations = useMemo(() => {
    if (isAdmin) return true;
    if (staffScope) return !isCommunityOnlyStaff;
    return false;
  }, [isAdmin, staffScope, isCommunityOnlyStaff]);
  // This only permits opening the portal while the profile loads; visible portal sections
  // still come exclusively from the linked staff profile above.
  const hasStaffPortalRole = useMemo(() => {
    const role = currentUser?.role;
    const roleScope = (typeof role === 'object' && role?.roleScope) || currentUser?.roleScope || currentUser?.activeRoleObj?.roleScope;
    return roleScope === 'COMMUNITY_STAFF' || roleScope === 'STAFF';
  }, [currentUser]);
  const hasStaffAccess = useMemo(() => {
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
      isDualStaff ||
      hasStaffPortalRole
    );
  }, [permissions, isAdmin, isDualStaff, hasStaffPortalRole]);

  // Fetch the profile first. Once it is loaded, the authoritative staff scope determines
  // whether allocation data should be requested.
  useEffect(() => {
    if (!hasStaffAccess) return;

    if (activeOrgId && activeOrgId !== currentOrgId) {
      dispatch(resetStaffState());
      dispatch(setCurrentOrgId(activeOrgId));
      dispatch(fetchMyProfileThunk());
      return;
    }

    if (!myProfile && !isProfileLoading && !profileError) {
      if (activeOrgId) dispatch(setCurrentOrgId(activeOrgId));
      dispatch(fetchMyProfileThunk());
      return;
    }

    if (myProfile) {
      if (canViewAllocations) dispatch(fetchMyAllocationsThunk());
      if (canViewAttendance) dispatch(fetchMyAttendanceThunk());
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
    isUnitStaff,
    isCommunityOnlyStaff,
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
