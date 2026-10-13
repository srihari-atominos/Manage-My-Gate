import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
  StaffFormModal,
  StaffDetailModal,
  StaffFilterSheet,
  StaffMember,
  CreateStaffPayload,
  UpdateStaffPayload,
} from '@/src/features/staff';
import {
  Users,
  ShieldAlert,
  RotateCw,
  Plus,
} from 'lucide-react-native';

export const StaffDirectoryScreen: React.FC = () => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const canAccess = useMemo(() => {
    return isFeatureAllowedForUser(
      { id: 'admin_staff_directory', permission: 'staff:view', categoryKey: 'staff_management' },
      user
    );
  }, [user]);

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

  // Active filter count for Directory
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

  const handleOpenDetail = (member: StaffMember) => {
    selectStaff(member);
    setShowDetailModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    try {
      await deleteStaff(deletingStaff._id);
      setDeletingStaff(null);
      if (selectedStaff?._id === deletingStaff._id) {
        setShowDetailModal(false);
      }
    } catch {
      // Error is stored in state
    }
  };

  const handleFormSubmit = async (data: CreateStaffPayload | UpdateStaffPayload) => {
    try {
      if (editingStaff) {
        await updateStaff(editingStaff._id, data as UpdateStaffPayload);
      } else {
        await createStaff(data as CreateStaffPayload);
      }
      setShowFormModal(false);
      setEditingStaff(null);
    } catch {
      // Error handled by redux
    }
  };

  const handleRefresh = () => {
    loadStaff();
  };

  // RBAC Guard
  if (!canAccess && !hasViewPermission) {
    return (
      <ScreenShell title="Staff Directory" subtitle="Staff Management">
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState
            title="Access Restricted"
            description="You do not have the required staff:view permissions to access the community staff registry."
            icon={ShieldAlert}
            actionLabel="Return"
            onAction={() => router.back()}
          />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Staff Directory"
      subtitle="Community Staff Registry"
      headerRight={
        <View className="flex-row items-center gap-1.5">
          {hasManagePermission && (
            <Button
              size="sm"
              variant="default"
              className="h-9 px-3 flex-row items-center gap-1 shadow-xs"
              onPress={handleOpenCreate}
              accessibilityLabel="Add New Staff Member"
            >
              <Plus size={16} className="text-primary-foreground" />
              <Text className="text-xs font-bold text-primary-foreground">Add Staff</Text>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full"
            onPress={handleRefresh}
            disabled={isLoading}
            accessibilityLabel="Refresh directory"
          >
            <RotateCw size={18} className={`text-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </View>
      }
    >
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
          <Text className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-0.5" numberOfLines={1}>
            {metrics.inHouse}
          </Text>
        </View>
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            Vendors
          </Text>
          <Text className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5" numberOfLines={1}>
            {metrics.vendor}
          </Text>
        </View>
      </View>

      {/* Main Staff Registry List */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pt-1 gap-3 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
      >
        {/* Error Banner */}
        {error ? (
          <View className="mb-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex-row items-center justify-between">
            <Text className="text-xs text-destructive font-medium flex-1 mr-2">{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text className="text-xs text-destructive font-bold">Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Loading Skeletons */}
        {isLoading && staffList.length === 0 ? (
          <SkeletonLoader count={4} />
        ) : staffList.length === 0 ? (
          <EmptyState
            title="No Staff Members Found"
            description={
              searchQuery || activeFilterCount > 0
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'No staff members have been registered in this community yet.'
            }
            icon={Users}
            actionLabel={hasManagePermission ? 'Add Staff Member' : undefined}
            onAction={hasManagePermission ? handleOpenCreate : undefined}
          />
        ) : (
          staffList.map((member) => (
            <StaffCard
              key={member._id}
              member={member}
              canManage={hasManagePermission}
              onPress={() => handleOpenDetail(member)}
              onEdit={() => handleOpenEdit(member)}
              onDelete={() => setDeletingStaff(member)}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button (Create) */}
      {hasManagePermission ? (
        <FAB
          label="Add Staff"
          iconName="Plus"
          onPress={handleOpenCreate}
          className="bottom-28 z-50 shadow-lg"
        />
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
};

export default StaffDirectoryScreen;
