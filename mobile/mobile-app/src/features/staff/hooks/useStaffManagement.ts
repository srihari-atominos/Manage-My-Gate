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
import { fetchRoles, type RoleData } from '../../roleBuilder/services/roleService';

export const DEPARTMENTS: StaffDepartment[] = [
  'Electrical',
  'Plumbing',
  'Housekeeping',
  'Security',
  'Carpentry',
  'Others',
];

export const STAFF_TYPES: StaffType[] = ['In-House Staff', 'External Vendor', 'Community Staff'];
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

  // UI Filter state (Attendance Reporting) - strictly 4 criteria: Session Status, Department, Date Period, Custom Date
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('ALL');
  const [attendanceDepartmentFilter, setAttendanceDepartmentFilter] = useState<string>('ALL');
  const [attendanceRoleFilter, setAttendanceRoleFilter] = useState<string>('ALL');
  const [attendanceStartDate, setAttendanceStartDate] = useState<string>('');
  const [attendanceEndDate, setAttendanceEndDate] = useState<string>('');
  const [attendanceSearch, setAttendanceSearch] = useState<string>('');
  const [attendanceRoleOptions, setAttendanceRoleOptions] = useState<{ key: string; label: string; scope: 'COMMUNITY' | 'UNIT' }[]>([]);

  // Legacy compatibility fallbacks
  const [attendanceGateFilter, setAttendanceGateFilter] = useState<string>('ALL');
  const [attendanceStaffFilter, setAttendanceStaffFilter] = useState<string>('ALL');

  // Load data for active community
  const loadStaff = useCallback(() => {
    if (!hasViewPermission) return;
    dispatch(fetchStaffThunk());
  }, [dispatch, hasViewPermission]);

  const loadAttendance = useCallback(
    (params?: any) => {
      if (!hasViewPermission) return;
      const queryParams: any = {};
      
      const sDate = params?.startDate !== undefined ? params.startDate : attendanceStartDate;
      const eDate = params?.endDate !== undefined ? params.endDate : attendanceEndDate;
      const status = params?.status !== undefined ? params.status : attendanceStatusFilter;
      const dept = params?.department !== undefined ? params.department : attendanceDepartmentFilter;
      const selectedRole = params?.staffCategory !== undefined ? params.staffCategory : attendanceRoleFilter;
      const staffCategory = selectedRole.startsWith('role:') ? 'ALL' : selectedRole;
      const roleId = selectedRole.startsWith('role:') ? selectedRole.slice(5) : '';
      const trade = params?.departmentOther !== undefined ? params.departmentOther : (dept.startsWith('trade:') ? dept.slice(6) : '');
      const department = dept.startsWith('trade:') ? 'ALL' : dept;
      const search = params?.search !== undefined ? params.search : attendanceSearch;

      if (sDate) queryParams.startDate = sDate;
      if (eDate) queryParams.endDate = eDate;
      if (status && status !== 'ALL' && status !== 'Missing Checkout') {
        queryParams.status = status;
      }
      if (department && department !== 'ALL') queryParams.department = department;
      if (trade) queryParams.departmentOther = trade;
      if (staffCategory && staffCategory !== 'ALL') queryParams.staffCategory = staffCategory;
      if (roleId) queryParams.roleId = roleId;
      if (search && search.trim()) queryParams.search = search.trim();
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      // Stats are fetched for the community and scoped by date/department if requested
      dispatch(fetchAttendanceStatsThunk(queryParams));
      dispatch(fetchAttendanceHistoryThunk(queryParams));
    },
    [
      dispatch,
      hasViewPermission,
      attendanceStartDate,
      attendanceEndDate,
      attendanceStatusFilter,
      attendanceDepartmentFilter,
      attendanceRoleFilter,
      attendanceSearch,
    ]
  );

  useEffect(() => {
    if (!hasViewPermission) return;
    let active = true;
    fetchRoles({ page: 1, limit: 100 })
      .then((response: any) => {
        const roles = (response?.data?.data || response?.data || response || []) as RoleData[];
        const options = roles
          .filter((role) => role.roleScope === 'COMMUNITY_STAFF' || role.roleScope === 'STAFF')
          .map((role) => ({ key: `role:${role._id || role.id}`, label: role.name, scope: role.roleScope === 'STAFF' ? 'UNIT' as const : 'COMMUNITY' as const }))
          .filter((role) => role.key !== 'role:undefined');
        if (active) setAttendanceRoleOptions(options);
      })
      .catch(() => { if (active) setAttendanceRoleOptions([]); });
    return () => { active = false; };
  }, [hasViewPermission, activeOrgId]);
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

    if (attendanceSearch.trim()) {
      const q = attendanceSearch.toLowerCase().trim();
      result = result.filter((r) => {
        const staffObj = typeof r.technicianId === 'object' && r.technicianId ? r.technicianId : null;
        const name = (staffObj?.name || r.staffCode || '').toLowerCase();
        const dept = (staffObj?.department || '').toLowerCase();
        const code = (r.staffCode || staffObj?.staffCode || '').toLowerCase();
        const gate = (r.checkInGate || r.exitGate || '').toLowerCase();
        return name.includes(q) || dept.includes(q) || code.includes(q) || gate.includes(q);
      });
    }

    if (attendanceStatusFilter === 'Open') {
      result = result.filter((r) => r.status === 'Open' && !r.isMissingCheckout);
    } else if (attendanceStatusFilter === 'Closed') {
      result = result.filter((r) => r.status === 'Closed');
    } else if (attendanceStatusFilter === 'Missing Checkout') {
      result = result.filter((r) => Boolean(r.isMissingCheckout));
    }

    if (attendanceDepartmentFilter !== 'ALL') {
      result = result.filter((r) => {
        const staffObj = typeof r.technicianId === 'object' && r.technicianId ? r.technicianId : null;
        const selected = attendanceDepartmentFilter;
        return selected.startsWith('trade:')
          ? staffObj?.department === 'Others' && staffObj?.departmentOther === selected.slice(6)
          : staffObj?.department === selected;
      });
    }

    if (attendanceRoleFilter !== 'ALL') {
      result = result.filter((r) => {
        const staffObj = typeof r.technicianId === 'object' && r.technicianId ? (r.technicianId as any) : null;
        if (attendanceRoleFilter.startsWith('role:')) {
          const roleId = typeof staffObj?.roleId === 'object' ? staffObj.roleId?._id || staffObj.roleId?.id : staffObj?.roleId;
          return String(roleId || '') === attendanceRoleFilter.slice(5);
        }
        return (staffObj?.staffCategory === 'UNIT' ? 'UNIT' : 'COMMUNITY') === attendanceRoleFilter;
      });
    }

    // Client-side date boundary matching
    if (attendanceStartDate) {
      const start = new Date(`${attendanceStartDate}T00:00:00.000Z`).getTime();
      if (!isNaN(start)) {
        result = result.filter((r) => new Date(r.checkInTime).getTime() >= start);
      }
    }

    if (attendanceEndDate) {
      const end = new Date(`${attendanceEndDate}T23:59:59.999Z`).getTime();
      if (!isNaN(end)) {
        result = result.filter((r) => new Date(r.checkInTime).getTime() <= end);
      }
    }

    return result;
  }, [
    attendanceRecords,
    attendanceSearch,
    attendanceStatusFilter,
    attendanceDepartmentFilter,
    attendanceRoleFilter,
    attendanceStartDate,
    attendanceEndDate,
  ]);

  const attendanceDepartmentOptions = useMemo(() => {
    const standard = DEPARTMENTS.filter((department) => department !== 'Others').map((department) => ({ key: department, label: department }));
    const trades = [...new Set(staffList.filter((staff) => staff.department === 'Others' && staff.departmentOther?.trim()).map((staff) => staff.departmentOther!.trim()))].sort((a, b) => a.localeCompare(b)).map((trade) => ({ key: `trade:`, label: trade }));
    const hasGenericOthers = staffList.some((staff) => staff.department === 'Others' && !staff.departmentOther?.trim());
    return [...standard, ...(hasGenericOthers ? [{ key: 'Others', label: 'Others' }] : []), ...trades];
  }, [staffList]);

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
    attendanceDepartmentFilter,
    setAttendanceDepartmentFilter,
    attendanceRoleFilter,
    setAttendanceRoleFilter,
    attendanceDepartmentOptions,
    attendanceRoleOptions,
    attendanceStartDate,
    setAttendanceStartDate,
    attendanceEndDate,
    setAttendanceEndDate,
    attendanceSearch,
    setAttendanceSearch,

    // Backwards-compat
    attendanceGateFilter,
    setAttendanceGateFilter,
    attendanceStaffFilter,
    setAttendanceStaffFilter,

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



