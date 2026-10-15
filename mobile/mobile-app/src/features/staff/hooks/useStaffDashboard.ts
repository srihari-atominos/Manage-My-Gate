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

  const hasStaffAccess = useMemo(() => {
    if (isAdmin) return true;
    const permissions = currentUser?.permissions || [];
    return (
      permissions.includes('staff:view_own') ||
      permissions.includes('staff.view_own') ||
      permissions.includes('staff:view') ||
      permissions.includes('staff:manage') ||
      permissions.includes('staff.view') ||
      permissions.includes('staff.manage') ||
      permissions.includes('staff') ||
      permissions.includes('*') ||
      permissions.includes('platform:super_admin')
    );
  }, [currentUser?.permissions, isAdmin]);

  // Auto-fetch profile, allocations, and attendance
  useEffect(() => {
    if (!hasStaffAccess) return;

    if (activeOrgId && activeOrgId !== currentOrgId) {
      dispatch(resetStaffState());
      dispatch(setCurrentOrgId(activeOrgId));
      dispatch(fetchMyProfileThunk());
      dispatch(fetchMyAllocationsThunk());
      dispatch(fetchMyAttendanceThunk());
    } else if (!myProfile && !isProfileLoading && !profileError) {
      if (activeOrgId) {
        dispatch(setCurrentOrgId(activeOrgId));
      }
      dispatch(fetchMyProfileThunk());
      dispatch(fetchMyAllocationsThunk());
      dispatch(fetchMyAttendanceThunk());
    }
  }, [hasStaffAccess, activeOrgId, currentOrgId, myProfile, isProfileLoading, profileError, dispatch]);

  const refreshProfile = useCallback(() => {
    if (hasStaffAccess) {
      dispatch(fetchMyProfileThunk());
      dispatch(fetchMyAllocationsThunk());
      dispatch(fetchMyAttendanceThunk());
    }
  }, [hasStaffAccess, dispatch]);

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
