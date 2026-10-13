import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
  StaffMember,
  CreateStaffPayload,
  UpdateStaffPayload,
  ResidentStaffScreen,
  StaffDashboardScreen,
} from '@/src/features/staff';
import { Users, ShieldAlert, Plus, RotateCw, CalendarClock, Home, UserCheck } from 'lucide-react-native';

export default function StaffManagementScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'allocations' | 'portal'>('directory');

  const {
    hasViewPermission,
    hasManagePermission,
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
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [attendanceReportMember, setAttendanceReportMember] = useState<{
    member: StaffMember | { name: string; department?: string; _id: string };
    records: any[];
  } | null>(null);

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

  // 1. RBAC Guard: Permission Denied View
  if (!hasViewPermission) {
    return (
      <ScreenShell title="Staff Management" subtitle="Administration & Security">
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState
            title="Access Restricted"
            description="You do not have the required staff:view permissions to access the community staff registry."
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
        <StaffDashboardScreen embeddedMode={true} />
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
