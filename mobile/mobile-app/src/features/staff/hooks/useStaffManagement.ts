import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchStaffThunk,
  createStaffThunk,
  updateStaffThunk,
  deleteStaffThunk,
  fetchAttendanceStatsThunk,
  fetchAttendanceHistoryThunk,
  setSelectedStaff,
  clearStaffError,
  setCurrentOrgId,
  resetStaffState,
} from '../store/staffSlice';
import { StaffMember, CreateStaffPayload, UpdateStaffPayload, StaffDepartment, StaffType, StaffStatus } from '../services/staffService';
import { checkIsAdmin } from '../../../utils/rbac';

export const DEPARTMENTS: StaffDepartment[] = [
  'Electrical',
  'Plumbing',
  'Housekeeping',
  'Security',
  'Carpentry',
  'Others',
];

export const STAFF_TYPES: StaffType[] = ['In-House Staff', 'External Vendor'];
export const STAFF_STATUSES: StaffStatus[] = ['Active', 'Inactive', 'Pending'];

export function useStaffManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const {
    staffList,
    isLoading,
    isSubmitting,
    error,
    selectedStaff,
    currentOrgId,
    attendanceStats,
    attendanceRecords,
    isAttendanceLoading,
    attendanceError,
  } = useSelector((state: RootState) => state.staff);

  // Active Organization context
  const activeOrgId = useMemo(() => {
    return user?.activeOrgId || user?.orgId || user?.organizationId || '';
  }, [user]);

  // Authorization checks
  const isAdmin = useMemo(() => checkIsAdmin(user), [user]);

  const hasViewPermission = useMemo(() => {
    if (isAdmin) return true;
    const permissions = user?.permissions || [];
    return (
      permissions.includes('staff:view') ||
      permissions.includes('staff:manage') ||
      permissions.includes('staff.view') ||
      permissions.includes('staff.manage') ||
      permissions.includes('staff') ||
      permissions.includes('*') ||
      permissions.includes('platform:super_admin')
    );
  }, [isAdmin, user?.permissions]);

  const hasManagePermission = useMemo(() => {
    if (isAdmin) return true;
    const permissions = user?.permissions || [];
    return (
      permissions.includes('staff:manage') ||
      permissions.includes('staff.manage') ||
      permissions.includes('*') ||
      permissions.includes('platform:super_admin')
    );
  }, [isAdmin, user?.permissions]);

  // UI Filter state (Staff Directory)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // UI Filter state (Attendance Reporting)
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('ALL');
  const [attendanceGateFilter, setAttendanceGateFilter] = useState<string>('ALL');

  // Load data for active community
  const loadStaff = useCallback(() => {
    if (!hasViewPermission) return;
    dispatch(fetchStaffThunk());
  }, [dispatch, hasViewPermission]);

  const loadAttendance = useCallback(
    (params?: any) => {
      if (!hasViewPermission) return;
      dispatch(fetchAttendanceStatsThunk(params));
      dispatch(fetchAttendanceHistoryThunk(params));
    },
    [dispatch, hasViewPermission]
  );

  // Invalidate and reload when active community changes
  const prevOrgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeOrgId && activeOrgId !== prevOrgIdRef.current) {
      prevOrgIdRef.current = activeOrgId;
      dispatch(setCurrentOrgId(activeOrgId));
      loadStaff();
      loadAttendance();
    }
  }, [activeOrgId, dispatch, loadStaff, loadAttendance]);

  // Client-side filtered list
  const filteredStaffList = useMemo(() => {
    let result = [...staffList];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const nameMatch = item.name?.toLowerCase().includes(q);
        const phoneMatch = item.phone?.toLowerCase().includes(q);
        const emailMatch = item.email?.toLowerCase().includes(q);
        const designationMatch = item.designation?.toLowerCase().includes(q);
        const staffCodeMatch = item.staffCode?.toLowerCase().includes(q);
        const deptMatch = item.department?.toLowerCase().includes(q);
        return Boolean(nameMatch || phoneMatch || emailMatch || designationMatch || staffCodeMatch || deptMatch);
      });
    }

    // Department filter
    if (selectedDepartment !== 'ALL') {
      result = result.filter((item) => item.department === selectedDepartment);
    }

    // Type filter
    if (selectedType !== 'ALL') {
      result = result.filter((item) => item.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((item) => item.status === selectedStatus);
    }

    return result;
  }, [staffList, searchQuery, selectedDepartment, selectedType, selectedStatus]);

  // Metrics
  const metrics = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === 'Active').length;
    const inHouse = staffList.filter((s) => s.type === 'In-House Staff').length;
    const vendor = staffList.filter((s) => s.type === 'External Vendor').length;
    return { total, active, inHouse, vendor };
  }, [staffList]);

  // CRUD Actions
  const createStaff = useCallback(
    async (payload: CreateStaffPayload) => {
      const result = await dispatch(createStaffThunk(payload));
      if (createStaffThunk.fulfilled.match(result)) {
        return result.payload;
      }
      throw new Error((result.payload as string) || 'Failed to create staff');
    },
    [dispatch]
  );

  const updateStaff = useCallback(
    async (id: string, payload: UpdateStaffPayload) => {
      const result = await dispatch(updateStaffThunk({ id, payload }));
      if (updateStaffThunk.fulfilled.match(result)) {
        return result.payload;
      }
      throw new Error((result.payload as string) || 'Failed to update staff');
    },
    [dispatch]
  );

  const deleteStaff = useCallback(
    async (id: string) => {
      const result = await dispatch(deleteStaffThunk(id));
      if (deleteStaffThunk.fulfilled.match(result)) {
        return true;
      }
      throw new Error((result.payload as string) || 'Failed to deactivate staff');
    },
    [dispatch]
  );

  const selectStaff = useCallback(
    (member: StaffMember | null) => {
      dispatch(setSelectedStaff(member));
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearStaffError());
  }, [dispatch]);

  // Client-side filtered attendance records
  const filteredAttendanceRecords = useMemo(() => {
    let result = [...attendanceRecords];

    if (attendanceStatusFilter === 'Open') {
      result = result.filter((r) => r.status === 'Open' && !r.isMissingCheckout);
    } else if (attendanceStatusFilter === 'Closed') {
      result = result.filter((r) => r.status === 'Closed');
    } else if (attendanceStatusFilter === 'Missing Checkout') {
      result = result.filter((r) => Boolean(r.isMissingCheckout));
    }

    if (attendanceGateFilter !== 'ALL') {
      result = result.filter(
        (r) => r.checkInGate === attendanceGateFilter || r.exitGate === attendanceGateFilter
      );
    }

    return result;
  }, [attendanceRecords, attendanceStatusFilter, attendanceGateFilter]);

  return {
    // Auth & Permission
    hasViewPermission,
    hasManagePermission,
    activeOrgId,

    // Data
    staffList: filteredStaffList,
    rawCount: staffList.length,
    metrics,
    isLoading,
    isSubmitting,
    error,
    selectedStaff,

    // Attendance Reporting Data
    attendanceStats,
    attendanceRecords: filteredAttendanceRecords,
    rawAttendanceCount: attendanceRecords.length,
    isAttendanceLoading,
    attendanceError,

    // Attendance Filters
    attendanceStatusFilter,
    setAttendanceStatusFilter,
    attendanceGateFilter,
    setAttendanceGateFilter,

    // Filters
    searchQuery,
    setSearchQuery,
    selectedDepartment,
    setSelectedDepartment,
    selectedType,
    setSelectedType,
    selectedStatus,
    setSelectedStatus,

    // Actions
    loadStaff,
    loadAttendance,
    createStaff,
    updateStaff,
    deleteStaff,
    selectStaff,
    clearError,
  };
}

export default useStaffManagement;
