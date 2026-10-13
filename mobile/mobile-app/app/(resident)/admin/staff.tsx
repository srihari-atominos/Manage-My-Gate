import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { FAB } from '@/components/ui/FAB';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  useStaffManagement,
  StaffCard,
  StaffAttendanceCard,
  StaffMemberAttendanceModal,
  StaffFormModal,
  StaffDetailModal,
  StaffFilterSheet,
  StaffAttendanceFilterSheet,
  StaffMember,
  CreateStaffPayload,
  UpdateStaffPayload,
  ResidentStaffScreen,
  StaffDashboardScreen,
  staffService,
} from '@/src/features/staff';
import {
  Users,
  ShieldAlert,
  Plus,
  RotateCw,
  CalendarClock,
  Home,
  UserCheck,
  FileDown,
  Filter,
  FileSpreadsheet,
} from 'lucide-react-native';
import { downloadCSVFile, downloadExcelFile } from '@/src/utils/downloadHelper';
import * as XLSX from 'xlsx';

export default function StaffManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const user = useSelector((state: RootState) => state.auth.user);

  // Tab permissions
  const canAccessDirectory = useMemo(() => {
    return isFeatureAllowedForUser(
      { id: 'admin_staff_directory', permission: 'staff:view', categoryKey: 'staff_management' },
      user
    );
  }, [user]);

  const canAccessAttendance = useMemo(() => {
    return isFeatureAllowedForUser(
      { id: 'admin_staff_attendance', permission: 'staff:attendance', categoryKey: 'staff_management' },
      user
    );
  }, [user]);

  const canAccessAllocations = useMemo(() => {
    return isFeatureAllowedForUser(
      { id: 'admin_staff_allocations', permission: 'staff:assign_unit', categoryKey: 'staff_management' },
      user
    );
  }, [user]);

  const canAccessPortal = useMemo(() => {
    return isFeatureAllowedForUser(
      { id: 'admin_staff_portal', permission: 'staff:view_own', categoryKey: 'staff_management' },
      user
    );
  }, [user]);

  // Determine initial valid tab
  const getInitialTab = (): 'directory' | 'attendance' | 'allocations' | 'portal' => {
    const requested = params?.tab as 'directory' | 'attendance' | 'allocations' | 'portal' | undefined;
    if (requested === 'attendance' && canAccessAttendance) return 'attendance';
    if (requested === 'allocations' && canAccessAllocations) return 'allocations';
    if (requested === 'portal' && canAccessPortal) return 'portal';
    if (requested === 'directory' && canAccessDirectory) return 'directory';

    if (canAccessDirectory) return 'directory';
    if (canAccessAttendance) return 'attendance';
    if (canAccessAllocations) return 'allocations';
    if (canAccessPortal) return 'portal';
    return 'directory';
  };

  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'allocations' | 'portal'>(getInitialTab);

  // Sync tab param if it changes dynamically
  useEffect(() => {
    if (params?.tab) {
      const requested = params.tab as 'directory' | 'attendance' | 'allocations' | 'portal';
      if (requested === 'attendance' && canAccessAttendance) setActiveTab('attendance');
      else if (requested === 'allocations' && canAccessAllocations) setActiveTab('allocations');
      else if (requested === 'portal' && canAccessPortal) setActiveTab('portal');
      else if (requested === 'directory' && canAccessDirectory) setActiveTab('directory');
    }
  }, [params?.tab, canAccessDirectory, canAccessAttendance, canAccessAllocations, canAccessPortal]);

  const {
    hasViewPermission,
    hasManagePermission,
    activeOrgId,
    staffList,
    rawCount,
    metrics,
    isLoading,
    isSubmitting,
    error,
    selectedStaff,
    attendanceStats,
    attendanceRecords,
    rawAttendanceCount,
    isAttendanceLoading,
    attendanceError,
    attendanceStatusFilter,
    setAttendanceStatusFilter,
    attendanceGateFilter,
    setAttendanceGateFilter,
    attendanceDepartmentFilter,
    setAttendanceDepartmentFilter,
    attendanceStaffFilter,
    setAttendanceStaffFilter,
    attendanceStartDate,
    setAttendanceStartDate,
    attendanceEndDate,
    setAttendanceEndDate,
    attendancePeriodPreset,
    setAttendancePeriodPreset,
    attendanceSearch,
    setAttendanceSearch,
    loadAttendance,
    searchQuery,
    setSearchQuery,
    selectedDepartment,
    setSelectedDepartment,
    selectedType,
    setSelectedType,
    selectedStatus,
    setSelectedStatus,
    loadStaff,
    createStaff,
    updateStaff,
    deleteStaff,
    selectStaff,
    clearError,
  } = useStaffManagement();

  // Modal visibility states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAttendanceFilterSheet, setShowAttendanceFilterSheet] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [attendanceReportMember, setAttendanceReportMember] = useState<{
    member: StaffMember | { name: string; department?: string; _id: string };
    records: any[];
  } | null>(null);

  // Active filter count for Attendance logs (strictly 4 criteria)
  const activeAttendanceFilterCount = useMemo(() => {
    let count = 0;
    if (attendanceStatusFilter !== 'ALL') count++;
    if (attendanceDepartmentFilter !== 'ALL') count++;
    if (attendancePeriodPreset !== 'all' || attendanceStartDate || attendanceEndDate) count++;
    return count;
  }, [
    attendanceStatusFilter,
    attendanceDepartmentFilter,
    attendancePeriodPreset,
    attendanceStartDate,
    attendanceEndDate,
  ]);

  const activePeriodLabel = useMemo(() => {
    if (attendancePeriodPreset === 'today') return 'Today';
    if (attendancePeriodPreset === 'yesterday') return 'Yesterday';
    if (attendancePeriodPreset === 'week') return 'This Week';
    if (attendancePeriodPreset === 'this_month') return 'This Month';
    if (attendancePeriodPreset === 'last_month') return 'Last Month';
    if (attendanceStartDate || attendanceEndDate) {
      if (attendanceStartDate && attendanceEndDate) {
        return `${attendanceStartDate} to ${attendanceEndDate}`;
      }
      return attendanceStartDate ? `From ${attendanceStartDate}` : `Up to ${attendanceEndDate}`;
    }
    return 'All Records';
  }, [attendancePeriodPreset, attendanceStartDate, attendanceEndDate]);

  const handleResetAttendanceFilters = () => {
    setAttendanceStatusFilter('ALL');
    setAttendanceDepartmentFilter('ALL');
    setAttendancePeriodPreset('all');
    setAttendanceStartDate('');
    setAttendanceEndDate('');
    setAttendanceGateFilter('ALL');
    setAttendanceStaffFilter('ALL');
    loadAttendance({
      status: undefined,
      department: undefined,
      startDate: undefined,
      endDate: undefined,
      search: attendanceSearch.trim() || undefined,
    });
  };

  // Formula injection defense for spreadsheet export
  const sanitizeField = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (/^[=+@\-\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  };

  const handleExportAttendanceCSV = async () => {
    try {
      setIsExporting(true);
      if (attendanceRecords.length === 0) {
        Alert.alert('No Data', 'There are no staff attendance records to export under the current filter.');
        return;
      }

      // Fetch all matching records for the active filter set across pagination
      let exportDataset = attendanceRecords;
      try {
        const fullQuery: any = { limit: 1000, page: 1 };
        if (attendanceStartDate) fullQuery.startDate = attendanceStartDate;
        if (attendanceEndDate) fullQuery.endDate = attendanceEndDate;
        if (attendanceStatusFilter !== 'ALL' && attendanceStatusFilter !== 'Missing Checkout') {
          fullQuery.status = attendanceStatusFilter;
        }
        if (attendanceDepartmentFilter !== 'ALL') fullQuery.department = attendanceDepartmentFilter;
        if (attendanceSearch.trim()) fullQuery.search = attendanceSearch.trim();

        const fullRes = await staffService.getAttendanceHistory(fullQuery);
        if (fullRes?.records && fullRes.records.length > 0) {
          exportDataset = fullRes.records;
        }
      } catch {
        // Fallback to locally displayed records if bulk fetch encounters error
        exportDataset = attendanceRecords;
      }

      const headers = [
        'Community ID',
        'Staff Name',
        'Department',
        'Staff Code',
        'Attendance Date',
        'Status',
        'Check-In Time',
        'Entry Gate',
        'Check-Out Time',
        'Exit Gate',
        'Duration (Mins)',
        'Exception Flag',
        'Notes',
      ];

      const rows = exportDataset.map((r) => {
        const staffObj = typeof r.technicianId === 'object' && r.technicianId ? r.technicianId : null;
        const orgStr = sanitizeField(r.orgId || activeOrgId || 'N/A').replace(/"/g, '""');
        const name = sanitizeField(staffObj?.name || r.staffCode || 'Staff Member').replace(/"/g, '""');
        const dept = sanitizeField(staffObj?.department || 'General').replace(/"/g, '""');
        const code = sanitizeField(r.staffCode || staffObj?.staffCode || '').replace(/"/g, '""');
        const attDate = r.checkInTime ? new Date(r.checkInTime).toISOString().split('T')[0] : '';
        const status = r.status || 'Open';
        const inTime = r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '';
        const inGate = sanitizeField(r.checkInGate || 'Main Gate').replace(/"/g, '""');
        const outTime = r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : 'In Progress';
        const outGate = sanitizeField(r.exitGate || (r.status === 'Open' ? 'On-Site' : 'Main Gate')).replace(/"/g, '""');
        const duration = r.durationMinutes !== undefined && r.durationMinutes !== null ? String(r.durationMinutes) : '0';
        const exceptionFlag = r.isMissingCheckout ? 'Missing Checkout' : 'Normal';
        const notes = sanitizeField(r.notes || '').replace(/"/g, '""');

        return `"${orgStr}","${name}","${dept}","${code}","${attDate}","${status}","${inTime}","${inGate}","${outTime}","${outGate}","${duration}","${exceptionFlag}","${notes}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const timestamp = new Date().toISOString().split('T')[0];
      const periodSuffix = attendancePeriodPreset !== 'all' ? `_${attendancePeriodPreset}` : '';
      await downloadCSVFile(csvContent, `nahom_staff_attendance_${timestamp}${periodSuffix}.csv`);
      Alert.alert('Export Successful', `Exported ${exportDataset.length} staff attendance records to CSV.`);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAttendanceExcel = async () => {
    try {
      setIsExporting(true);
      if (attendanceRecords.length === 0) {
        Alert.alert('No Data', 'There are no staff attendance records to export under the current filter.');
        return;
      }

      // Fetch all matching records for the active filter set across pagination
      let exportDataset = attendanceRecords;
      try {
        const fullQuery: any = { limit: 1000, page: 1 };
        if (attendanceStartDate) fullQuery.startDate = attendanceStartDate;
        if (attendanceEndDate) fullQuery.endDate = attendanceEndDate;
        if (attendanceStatusFilter !== 'ALL' && attendanceStatusFilter !== 'Missing Checkout') {
          fullQuery.status = attendanceStatusFilter;
        }
        if (attendanceDepartmentFilter !== 'ALL') fullQuery.department = attendanceDepartmentFilter;
        if (attendanceSearch.trim()) fullQuery.search = attendanceSearch.trim();

        const fullRes = await staffService.getAttendanceHistory(fullQuery);
        if (fullRes?.records && fullRes.records.length > 0) {
          exportDataset = fullRes.records;
        }
      } catch {
        exportDataset = attendanceRecords;
      }

      const rows = exportDataset.map((r) => {
        const staffObj = typeof r.technicianId === 'object' && r.technicianId ? r.technicianId : null;
        return {
          'Community ID': sanitizeField(r.orgId || activeOrgId || 'N/A'),
          'Staff Name': sanitizeField(staffObj?.name || r.staffCode || 'Staff Member'),
          'Department': sanitizeField(staffObj?.department || 'General'),
          'Staff Code': sanitizeField(r.staffCode || staffObj?.staffCode || ''),
          'Attendance Date': r.checkInTime ? new Date(r.checkInTime).toISOString().split('T')[0] : '',
          'Status': r.status || 'Open',
          'Check-In Time': r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '',
          'Entry Gate': sanitizeField(r.checkInGate || 'Main Gate'),
          'Check-Out Time': r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : 'In Progress',
          'Exit Gate': sanitizeField(r.exitGate || (r.status === 'Open' ? 'On-Site' : 'Main Gate')),
          'Duration (Minutes)': r.durationMinutes ?? 0,
          'Exception Flag': r.isMissingCheckout ? 'Missing Checkout' : 'Normal',
          'Notes': sanitizeField(r.notes || ''),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      // Auto-fit column widths
      worksheet['!cols'] = [
        { wch: 24 }, // Community ID
        { wch: 20 }, // Staff Name
        { wch: 16 }, // Department
        { wch: 14 }, // Staff Code
        { wch: 16 }, // Attendance Date
        { wch: 12 }, // Status
        { wch: 22 }, // Check-In Time
        { wch: 14 }, // Entry Gate
        { wch: 22 }, // Check-Out Time
        { wch: 14 }, // Exit Gate
        { wch: 18 }, // Duration
        { wch: 18 }, // Exception Flag
        { wch: 24 }, // Notes
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Logs');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const timestamp = new Date().toISOString().split('T')[0];
      const periodSuffix = attendancePeriodPreset !== 'all' ? `_${attendancePeriodPreset}` : '';
      await downloadExcelFile(blob, `nahom_staff_attendance_${timestamp}${periodSuffix}.xlsx`);
      Alert.alert('Export Successful', `Exported ${exportDataset.length} staff attendance records to Excel (.xlsx).`);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance records.');
    } finally {
      setIsExporting(false);
    }
  };

  // Active filter count for Staff Directory
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDepartment !== 'ALL') count++;
    if (selectedType !== 'ALL') count++;
    if (selectedStatus !== 'ALL') count++;
    return count;
  }, [selectedDepartment, selectedType, selectedStatus]);

  const handleResetFilters = () => {
    setSelectedDepartment('ALL');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setShowFormModal(true);
  };

  const handleOpenDetails = (member: StaffMember) => {
    selectStaff(member);
    setShowDetailModal(true);
  };

  const handleFormSubmit = async (payload: CreateStaffPayload | UpdateStaffPayload) => {
    if (editingStaff?._id) {
      await updateStaff(editingStaff._id, payload as UpdateStaffPayload);
    } else {
      await createStaff(payload as CreateStaffPayload);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff?._id) return;
    try {
      await deleteStaff(deletingStaff._id);
      setDeletingStaff(null);
    } catch (err: any) {
      Alert.alert('Deactivation Error', err?.message || 'Failed to deactivate staff member.');
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'directory') {
      loadStaff();
    } else if (activeTab === 'attendance') {
      loadAttendance();
    }
  };

  const isCurrentLoading = activeTab === 'directory' ? isLoading : activeTab === 'attendance' ? isAttendanceLoading : false;

  const hasAnyStaffAccess = canAccessDirectory || canAccessAttendance || canAccessAllocations || canAccessPortal || hasViewPermission;

  // 1. RBAC Guard: Permission Denied View
  if (!hasAnyStaffAccess) {
    return (
      <ScreenShell title="Staff Management" subtitle="Administration & Security">
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState
            title="Access Restricted"
            description="You do not have permissions to access Staff Management."
            icon={ShieldAlert}
            actionLabel="Return to Administration"
            onAction={() => router.back()}
          />
        </View>
      </ScreenShell>
    );
  }

  const getSubtitle = () => {
    switch (activeTab) {
      case 'directory':
        return 'Community Staff & Registry';
      case 'attendance':
        return 'Gate Attendance & Reports';
      case 'allocations':
        return 'Households & Unit Access';
      case 'portal':
        return 'Staff Member Portal & Pass';
      default:
        return 'Administration & Security';
    }
  };

  return (
    <ScreenShell
      title="Staff Management"
      subtitle={getSubtitle()}
      headerRight={
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full"
          onPress={handleRefresh}
          disabled={isCurrentLoading}
          accessibilityLabel="Refresh current view"
        >
          <RotateCw size={18} className={`text-foreground ${isCurrentLoading ? 'animate-spin' : ''}`} />
        </Button>
      }
    >
      {/* Top Segmented Tab Switcher (4 Unified Hub Tabs) */}
      <View className="mx-4 mt-2 mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row p-1 rounded-2xl bg-muted/60 border border-border gap-1"
        >
          {canAccessDirectory && (
            <TouchableOpacity
              onPress={() => setActiveTab('directory')}
              className={`px-3.5 py-2 rounded-xl items-center justify-center flex-row ${
                activeTab === 'directory' ? 'bg-card shadow-xs' : ''
              }`}
              accessibilityRole="tab"
              accessibilityLabel="Staff Directory Tab"
            >
              <Users size={14} className={`me-1.5 ${activeTab === 'directory' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'directory' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Directory
              </Text>
            </TouchableOpacity>
          )}

          {canAccessAttendance && (
            <TouchableOpacity
              onPress={() => {
                setActiveTab('attendance');
                loadAttendance();
              }}
              className={`px-3.5 py-2 rounded-xl items-center justify-center flex-row ${
                activeTab === 'attendance' ? 'bg-card shadow-xs' : ''
              }`}
              accessibilityRole="tab"
              accessibilityLabel="Attendance Logs Tab"
            >
              <CalendarClock size={14} className={`me-1.5 ${activeTab === 'attendance' ? 'text-primary' : 'text-muted-foreground'}`} />
              <View className="flex-row items-center">
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'attendance' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Attendance Logs
                </Text>
                {attendanceStats && attendanceStats.missingCheckoutSessions > 0 ? (
                  <View className="ms-1.5 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </View>
            </TouchableOpacity>
          )}

          {canAccessAllocations && (
            <TouchableOpacity
              onPress={() => setActiveTab('allocations')}
              className={`px-3.5 py-2 rounded-xl items-center justify-center flex-row ${
                activeTab === 'allocations' ? 'bg-card shadow-xs' : ''
              }`}
              accessibilityRole="tab"
              accessibilityLabel="Unit Allocations Tab"
            >
              <Home size={14} className={`me-1.5 ${activeTab === 'allocations' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'allocations' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Unit Allocations
              </Text>
            </TouchableOpacity>
          )}

          {canAccessPortal && (
            <TouchableOpacity
              onPress={() => setActiveTab('portal')}
              className={`px-3.5 py-2 rounded-xl items-center justify-center flex-row ${
                activeTab === 'portal' ? 'bg-card shadow-xs' : ''
              }`}
              accessibilityRole="tab"
              accessibilityLabel="Staff Member Portal Tab"
            >
              <UserCheck size={14} className={`me-1.5 ${activeTab === 'portal' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'portal' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Staff Portal & Pass
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'directory' ? (
        <>
          {/* Search & Filter Header */}
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by name, phone, or code..."
            onFilterPress={() => setShowFilterSheet(true)}
            activeFilterCount={activeFilterCount}
          />

          {/* Metrics Row */}
          <View className="flex-row gap-2 px-4 py-2">
            <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
              <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
                Total Staff
              </Text>
              <Text className="text-sm font-bold text-foreground mt-0.5" numberOfLines={1}>
                {metrics.total}
              </Text>
            </View>
            <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
              <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
                Active
              </Text>
              <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5" numberOfLines={1}>
                {metrics.active}
              </Text>
            </View>
            <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
              <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
                In-House
              </Text>
              <Text className="text-sm font-bold text-primary mt-0.5" numberOfLines={1}>
                {metrics.inHouse}
              </Text>
            </View>
            <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
              <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
                Vendors
              </Text>
              <Text className="text-sm font-bold text-foreground mt-0.5" numberOfLines={1}>
                {metrics.vendor}
              </Text>
            </View>
          </View>

          {/* Main Staff Registry List */}
          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={loadStaff} tintColor="#2563EB" />
            }
          >
            {/* Error Banner */}
            {error ? (
              <View className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 flex-row items-center justify-between">
                <Text className="text-xs text-destructive font-medium flex-1 me-2">{error}</Text>
                <Button size="sm" variant="outline" className="h-7 px-2.5" onPress={loadStaff}>
                  Retry
                </Button>
              </View>
            ) : null}

            {/* Loading Skeletons */}
            {isLoading && staffList.length === 0 ? (
              <SkeletonLoader count={4} />
            ) : staffList.length === 0 ? (
              <EmptyState
                title={rawCount === 0 ? 'No Staff Registered' : 'No Results Found'}
                description={
                  rawCount === 0
                    ? 'No staff members have been registered in this community yet.'
                    : 'No staff members match the selected search or filter criteria.'
                }
                icon={Users}
                actionLabel={
                  rawCount === 0 && hasManagePermission
                    ? '+ Add First Staff Member'
                    : activeFilterCount > 0
                    ? 'Clear Filters'
                    : undefined
                }
                onAction={
                  rawCount === 0 && hasManagePermission
                    ? handleOpenCreate
                    : activeFilterCount > 0
                    ? handleResetFilters
                    : undefined
                }
              />
            ) : (
              staffList.map((member) => (
                <StaffCard
                  key={member._id}
                  member={member}
                  canManage={hasManagePermission}
                  onPress={() => handleOpenDetails(member)}
                  onEdit={() => handleOpenEdit(member)}
                  onDelete={() => setDeletingStaff(member)}
                />
              ))
            )}
          </ScrollView>

          {/* Floating Action Button for Adding Staff */}
          {hasManagePermission ? (
            <FAB
              label="Add Staff"
              iconName="Plus"
              onPress={handleOpenCreate}
            />
          ) : null}
        </>
      ) : activeTab === 'attendance' ? (
        /* TAB 2: ATTENDANCE LOGS & REPORTING */
        <>
          {/* Attendance Summary Metrics */}
          <View className="flex-row gap-2 px-4 py-2">
            <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
              <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
                Total
              </Text>
              <Text className="text-sm font-bold text-foreground mt-0.5" numberOfLines={1}>
                {attendanceStats?.totalSessions ?? 0}
              </Text>
            </View>
            <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
              <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
                On-Site
              </Text>
              <Text className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5" numberOfLines={1}>
                {attendanceStats?.openSessions ?? 0}
              </Text>
            </View>
            <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
              <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
                Completed
              </Text>
              <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5" numberOfLines={1}>
                {attendanceStats?.closedSessions ?? 0}
              </Text>
            </View>
            <View
              className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center min-w-0 ${
                (attendanceStats?.missingCheckoutSessions ?? 0) > 0
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-card border-border'
              }`}
            >
              <Text
                className={`text-[11px] font-medium text-center ${
                  (attendanceStats?.missingCheckoutSessions ?? 0) > 0
                    ? 'text-destructive font-semibold'
                    : 'text-muted-foreground'
                }`}
                numberOfLines={1}
              >
                Exceptions
              </Text>
              <Text
                className={`text-sm font-bold mt-0.5 ${
                  (attendanceStats?.missingCheckoutSessions ?? 0) > 0
                    ? 'text-destructive'
                    : 'text-foreground'
                }`}
              >
                {attendanceStats?.missingCheckoutSessions ?? 0}
              </Text>
            </View>
          </View>

          {/* Search, Filter & Export Action Bar */}
          <View className="px-4 py-2 border-b border-border/40 bg-card/40">
            <SearchFilterBar
              searchPlaceholder="Search staff name, code, gate..."
              searchValue={attendanceSearch}
              onSearchChange={setAttendanceSearch}
              onFilterPress={() => setShowAttendanceFilterSheet(true)}
              activeFilterCount={activeAttendanceFilterCount}
            />
            {/* Export Toolbar & Active Period Info */}
            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border/30">
              <View className="flex-row items-center flex-1 me-2">
                <Text className="text-xs text-muted-foreground font-medium">
                  {attendanceRecords.length} {attendanceRecords.length === 1 ? 'record' : 'records'}
                </Text>
                <View className="mx-1.5 h-3 w-px bg-border" />
                <View className="px-2 py-0.5 rounded-full bg-muted/60">
                  <Text className="text-[10px] font-semibold text-foreground/80">
                    {activePeriodLabel}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 flex-row items-center gap-1.5"
                  onPress={handleExportAttendanceCSV}
                  disabled={isExporting || attendanceRecords.length === 0}
                  accessibilityLabel="Export Attendance CSV"
                >
                  <FileDown size={14} className="text-foreground" />
                  <Text className="text-xs font-semibold">CSV</Text>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 flex-row items-center gap-1.5 border-emerald-500/40 bg-emerald-500/5"
                  onPress={handleExportAttendanceExcel}
                  disabled={isExporting || attendanceRecords.length === 0}
                  accessibilityLabel="Export Attendance Excel (.xlsx)"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Excel</Text>
                </Button>
              </View>
            </View>
          </View>

          {/* Status Filter Chips: Horizontally scrollable */}
          <View className="shrink-0 py-2 border-b border-border/30">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="px-4 gap-2 items-center"
            >
              {(['ALL', 'Open', 'Closed', 'Missing Checkout'] as const).map((status) => {
                const isSelected = attendanceStatusFilter === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setAttendanceStatusFilter(status)}
                    className={`px-4 py-2 rounded-full border transition-all flex-row items-center justify-center ${
                      isSelected
                        ? 'bg-primary border-primary shadow-xs'
                        : 'bg-card border-border/70'
                    }`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter ${status}`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {status === 'ALL' ? 'All' : status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Attendance Sessions List */}
          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
            refreshControl={
              <RefreshControl
                refreshing={isAttendanceLoading}
                onRefresh={loadAttendance}
                tintColor="#2563EB"
              />
            }
          >
            {/* Error Banner */}
            {attendanceError ? (
              <View className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 flex-row items-center justify-between">
                <Text className="text-xs text-destructive font-medium flex-1 me-2">{attendanceError}</Text>
                <Button size="sm" variant="outline" className="h-7 px-2.5" onPress={loadAttendance}>
                  Retry
                </Button>
              </View>
            ) : null}

            {/* Loading Skeletons */}
            {isAttendanceLoading && attendanceRecords.length === 0 ? (
              <SkeletonLoader count={4} />
            ) : attendanceRecords.length === 0 ? (
              <EmptyState
                title="No Attendance Records"
                description={
                  attendanceStatusFilter !== 'ALL'
                    ? `No attendance records match status "${attendanceStatusFilter}".`
                    : 'No staff gate attendance records have been registered for this community yet.'
                }
                icon={CalendarClock}
                actionLabel={attendanceStatusFilter !== 'ALL' ? 'Clear Filter' : undefined}
                onAction={attendanceStatusFilter !== 'ALL' ? () => setAttendanceStatusFilter('ALL') : undefined}
              />
            ) : (
              attendanceRecords.map((record) => {
                const staffObj = typeof record.technicianId === 'object' && record.technicianId ? record.technicianId : null;
                const sName = staffObj?.name || record.staffCode || 'Staff Member';
                const sDept = staffObj?.department || 'General';
                const sId = staffObj?._id || String(record.technicianId);

                return (
                  <TouchableOpacity
                    key={record._id}
                    onPress={() => {
                      const memberRecords = attendanceRecords.filter((r) => {
                        const targetId = typeof r.technicianId === 'object' && r.technicianId ? r.technicianId._id : String(r.technicianId);
                        return targetId === sId;
                      });
                      setAttendanceReportMember({
                        member: { _id: sId, name: sName, department: sDept },
                        records: memberRecords,
                      });
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`View full attendance dossier for ${sName}`}
                  >
                    <StaffAttendanceCard record={record} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </>
      ) : activeTab === 'allocations' ? (
        /* TAB 3: UNIT ALLOCATIONS & ASSIGNMENTS */
        <ResidentStaffScreen embeddedMode={true} />
      ) : activeTab === 'portal' ? (
        /* TAB 4: STAFF PORTAL & DIGITAL PASS */
        <StaffDashboardScreen embeddedMode={true} onSwitchToDirectory={() => setActiveTab('directory')} />
      ) : null}

      {/* Modals & Sheets */}
      <StaffFormModal
        visible={showFormModal}
        member={editingStaff}
        isSubmitting={isSubmitting}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
      />

      <StaffDetailModal
        visible={showDetailModal}
        member={selectedStaff}
        canManage={hasManagePermission}
        onClose={() => setShowDetailModal(false)}
        onEdit={() => {
          if (selectedStaff) {
            handleOpenEdit(selectedStaff);
          }
        }}
      />

      <StaffFilterSheet
        visible={showFilterSheet}
        selectedDepartment={selectedDepartment}
        selectedType={selectedType}
        selectedStatus={selectedStatus}
        onSelectDepartment={setSelectedDepartment}
        onSelectType={setSelectedType}
        onSelectStatus={setSelectedStatus}
        onReset={handleResetFilters}
        onClose={() => setShowFilterSheet(false)}
      />

      <StaffAttendanceFilterSheet
        visible={showAttendanceFilterSheet}
        selectedStatus={attendanceStatusFilter}
        selectedDepartment={attendanceDepartmentFilter}
        startDate={attendanceStartDate}
        endDate={attendanceEndDate}
        activePeriod={attendancePeriodPreset}
        onSelectStatus={setAttendanceStatusFilter}
        onSelectDepartment={setAttendanceDepartmentFilter}
        onChangeStartDate={setAttendanceStartDate}
        onChangeEndDate={setAttendanceEndDate}
        onApplyPeriodPreset={setAttendancePeriodPreset}
        onApplyFilters={() => {
          loadAttendance();
        }}
        onReset={handleResetAttendanceFilters}
        onClose={() => setShowAttendanceFilterSheet(false)}
      />

      <StaffMemberAttendanceModal
        visible={Boolean(attendanceReportMember)}
        onClose={() => setAttendanceReportMember(null)}
        staffName={attendanceReportMember?.member?.name || 'Staff Member'}
        department={attendanceReportMember?.member?.department}
        records={attendanceReportMember?.records || []}
      />

      <ConfirmationModal
        visible={Boolean(deletingStaff)}
        title="Deactivate Staff Member"
        message={`Are you sure you want to deactivate ${deletingStaff?.name}? Their account will be marked inactive and access revoked.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        variant="danger"
        loading={isSubmitting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingStaff(null)}
      />
    </ScreenShell>
  );
}
