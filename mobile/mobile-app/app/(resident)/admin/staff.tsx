import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
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
import { useTranslation } from '@/src/utils/i18n';
import { useStaffToast } from '@/src/features/staff/hooks/useStaffToast';
import { useStaffDeleteImpact, buildStaffDeleteMessage } from '@/src/features/staff/hooks/useStaffDeleteImpact';
import {
  Users,
  ShieldAlert,
  Plus,
  CalendarClock,
  Home,
  UserCheck,
  FileDown,
  Filter,
  FileSpreadsheet,
  FileText,
} from 'lucide-react-native';
import { downloadCSVFile, downloadExcelFile, downloadPDFFile } from '@/src/utils/downloadHelper';

export default function StaffManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
  const { showToast, toastNode } = useStaffToast();
  const deleteUnitCount = useStaffDeleteImpact(deletingStaff);
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
    if (attendanceRoleFilter !== 'ALL') count++;
    if (attendanceStartDate || attendanceEndDate) count++;
    return count;
  }, [
    attendanceStatusFilter,
    attendanceDepartmentFilter,
    attendanceRoleFilter,
    attendanceStartDate,
    attendanceEndDate,
  ]);

  const attendanceRangeLabel = attendanceStartDate || attendanceEndDate
    ? `${attendanceStartDate || 'Start'} to ${attendanceEndDate || 'Today'}`
    : 'All attendance';

  const handleResetAttendanceFilters = () => {
    setAttendanceStatusFilter('ALL');
    setAttendanceDepartmentFilter('ALL');
    setAttendanceRoleFilter('ALL');
    setAttendanceStartDate('');
    setAttendanceEndDate('');
    setAttendanceGateFilter('ALL');
    setAttendanceStaffFilter('ALL');
    loadAttendance({
      status: undefined,
      department: undefined,
      staffCategory: undefined,
      startDate: undefined,
      endDate: undefined,
      search: attendanceSearch.trim() || undefined,
    });
  };

  const buildAttendanceExportQuery = () => {
    const query: Record<string, string> = {};
    if (attendanceStatusFilter !== 'ALL') query.status = attendanceStatusFilter;
    if (attendanceDepartmentFilter !== 'ALL') {
      if (attendanceDepartmentFilter.startsWith('trade:')) query.departmentOther = attendanceDepartmentFilter.slice(6);
      else query.department = attendanceDepartmentFilter;
    }
    if (attendanceRoleFilter !== 'ALL') {
      if (attendanceRoleFilter.startsWith('role:')) query.roleId = attendanceRoleFilter.slice(5);
      else query.staffCategory = attendanceRoleFilter;
    }
    if (attendanceStartDate) query.startDate = attendanceStartDate;
    if (attendanceEndDate) query.endDate = attendanceEndDate;
    if (attendanceSearch.trim()) query.search = attendanceSearch.trim();
    return query;
  };

  const handleExportAttendanceCSV = async () => {
    try {
      setIsExporting(true);
      const blob = await staffService.exportAttendanceReport(buildAttendanceExportQuery(), 'csv');
      await downloadCSVFile(typeof (blob as any)?.text === 'function' ? await (blob as any).text() : String(blob || ''), `staff_attendance_${new Date().toISOString().split('T')[0]}.csv`);
      Alert.alert('Export Successful', 'Attendance report exported with the selected filters.');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance records.');
    } finally { setIsExporting(false); }
  };

  const handleExportAttendancePDF = async () => {
    try {
      setIsExporting(true);
      const blob = await staffService.exportAttendanceReport(buildAttendanceExportQuery(), 'pdf');
      await downloadPDFFile(blob, `staff_attendance_${new Date().toISOString().split('T')[0]}.pdf`);
      Alert.alert('Export Successful', 'Attendance PDF exported with the selected filters.');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance PDF.');
    } finally { setIsExporting(false); }
  };
  const handleExportAttendanceExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await staffService.exportAttendanceReport(buildAttendanceExportQuery(), 'xlsx');
      await downloadExcelFile(blob, `staff_attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
      Alert.alert('Export Successful', 'Attendance report exported with the selected filters.');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export attendance records.');
    } finally { setIsExporting(false); }
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
      const updated = await updateStaff(editingStaff._id, payload as UpdateStaffPayload);
      showToast(t('staff_dir_toast_saved', 'Staff details saved'));
      return updated;
    } else {
      const created = await createStaff(payload as CreateStaffPayload);
      showToast(t('staff_dir_toast_added', 'Staff member added'));
      return created;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff?._id) return;
    try {
      await deleteStaff(deletingStaff._id);
      showToast(t('staff_dir_toast_removed', '{{name}} removed from the directory', { name: deletingStaff.name }));
      setDeletingStaff(null);
    } catch (err: any) {
      setDeletingStaff(null);
      Alert.alert('Could not delete', err?.message || 'Failed to delete staff member.');
    }
  };

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
        activeTab === 'directory' && hasManagePermission ? (
          <HeaderActionButton
            onPress={handleOpenCreate}
            icon={Plus}
            label="Add Staff"
            accessibilityLabel="Add Staff"
          />
        ) : undefined
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

      {toastNode}

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
          <FlatList
            className="flex-1 px-4 pt-2"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
            data={staffList}
            keyExtractor={(item) => item._id}
            initialNumToRender={8}
            windowSize={7}
            removeClippedSubviews
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={loadStaff} tintColor="#2563EB" />
            }
            ListHeaderComponent={
              error ? (
                <View className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 flex-row items-center justify-between">
                  <Text className="text-xs text-destructive font-medium flex-1 me-2">{error}</Text>
                  <Button size="sm" variant="outline" className="h-7 px-2.5" onPress={loadStaff}>
                    Retry
                  </Button>
                </View>
              ) : null
            }
            ListEmptyComponent={
              isLoading ? (
                <SkeletonLoader count={4} />
              ) : (
                <EmptyState
                  title={rawCount === 0 ? 'No Staff Registered' : 'No Results Found'}
                  description={
                    rawCount === 0
                      ? 'No staff members have been registered in this community yet.'
                      : 'No staff members match the selected search or filter criteria.'
                  }
                  icon={Users}
                  actionLabel={activeFilterCount > 0 ? 'Clear Filters' : undefined}
                  onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
                />
              )
            }
            renderItem={({ item }) => (
              <StaffCard
                member={item}
                canManage={hasManagePermission}
                onPress={handleOpenDetails}
                onEdit={handleOpenEdit}
                onDelete={setDeletingStaff}
              />
            )}
          />

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
                    {attendanceRangeLabel}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 flex-row items-center gap-1.5"
                  onPress={handleExportAttendanceCSV}
                  disabled={isExporting}
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
                  disabled={isExporting}
                  accessibilityLabel="Export Attendance Excel (.xlsx)"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Excel</Text>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 flex-row items-center gap-1.5 border-rose-500/40 bg-rose-500/5"
                  onPress={handleExportAttendancePDF}
                  disabled={isExporting}
                  accessibilityLabel="Export Attendance PDF"
                >
                  <FileText size={14} className="text-rose-600 dark:text-rose-400" />
                  <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">PDF</Text>
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
        onSaved={loadStaff}
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
        selectedRole={attendanceRoleFilter}
        departmentOptions={attendanceDepartmentOptions}
        roleOptions={attendanceRoleOptions}
        startDate={attendanceStartDate}
        endDate={attendanceEndDate}
        onSelectStatus={setAttendanceStatusFilter}
        onSelectDepartment={setAttendanceDepartmentFilter}
        onSelectRole={setAttendanceRoleFilter}
        onChangeStartDate={setAttendanceStartDate}
        onChangeEndDate={setAttendanceEndDate}
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
        message={buildStaffDeleteMessage(deletingStaff?.name, deleteUnitCount, t)}
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






