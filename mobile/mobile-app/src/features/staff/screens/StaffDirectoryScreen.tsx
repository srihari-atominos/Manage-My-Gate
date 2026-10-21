import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { Chip } from '@/components/common/Chip';
import { useTranslation } from '@/src/utils/i18n';
import { useRefreshOnFocus } from '@/src/hooks/useRefreshOnFocus';
import { Text } from '@/components/ui/text';
import { useStaffManagement, DEPARTMENTS } from '../hooks/useStaffManagement';
import { useStaffToast } from '../hooks/useStaffToast';
import { useStaffDeleteImpact, buildStaffDeleteMessage } from '../hooks/useStaffDeleteImpact';
import { StaffCard } from '../components/StaffCard';
import { StaffFormModal } from '../components/StaffFormModal';
import { StaffDetailModal } from '../components/StaffDetailModal';
import { StaffFilterSheet } from '../components/StaffFilterSheet';
import { StaffMember, CreateStaffPayload, UpdateStaffPayload } from '../services/staffService';
import { ShieldAlert, Plus } from 'lucide-react-native';

export const StaffDirectoryScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
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
    staffList,
    metrics,
    attendanceStats,
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
    loadAttendance,
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
  const { showToast, toastNode } = useStaffToast();
  const deleteUnitCount = useStaffDeleteImpact(deletingStaff);

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

  const handleOpenEdit = useCallback((member: StaffMember) => {
    setEditingStaff(member);
    setShowFormModal(true);
  }, []);

  const handleOpenDetail = useCallback(
    (member: StaffMember) => {
      selectStaff(member);
      setShowDetailModal(true);
    },
    [selectStaff]
  );

  const handleAskDelete = useCallback((member: StaffMember) => setDeletingStaff(member), []);

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    try {
      await deleteStaff(deletingStaff._id);
      showToast(t('staff_dir_toast_removed', '{{name}} removed from the directory', { name: deletingStaff.name }));
      if (selectedStaff?._id === deletingStaff._id) {
        setShowDetailModal(false);
      }
    } catch {
      // The error banner below shows why; close the dialog so it is visible.
    } finally {
      setDeletingStaff(null);
    }
  };

  const handleFormSubmit = async (data: CreateStaffPayload | UpdateStaffPayload) => {
    try {
      if (editingStaff) {
        const updated = await updateStaff(editingStaff._id, data as UpdateStaffPayload);
        showToast(t('staff_dir_toast_saved', 'Staff details saved'));
        return updated;
      } else {
        const created = await createStaff(data as CreateStaffPayload);
        showToast(t('staff_dir_toast_added', 'Staff member added'));
        return created;
      }
      setShowFormModal(false);
      setEditingStaff(null);
    } catch {
      // Error handled by redux
    }
  };

  const handleRefresh = () => {
    loadStaff();
    loadAttendance();
  };

  useRefreshOnFocus(handleRefresh);

  // RBAC Guard
  if (!canAccess && !hasViewPermission) {
    return (
      <ScreenShell title={t('staff_dir_title', 'Staff Directory')} subtitle={t('cat_staff_management', 'Staff Management')}>
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState
            title={t('staff_dir_denied_title', 'Access Restricted')}
            description={t('staff_dir_denied_desc', 'You do not have the required staff:view permissions to access the community staff registry.')}
            icon={ShieldAlert}
            actionLabel={t('staff_dir_return', 'Return')}
            onAction={() => router.back()}
          />
        </View>
      </ScreenShell>
    );
  }

  // Live on-site count derived from active gate attendance sessions
  const onSiteCount = attendanceStats?.openSessions ?? 0;

  return (
    <ScreenShell
      title={t('staff_dir_title', 'Staff Directory')}
      subtitle={t('staff_dir_subtitle', 'Community Staff Registry')}
      headerRight={
        hasManagePermission ? (
          <HeaderActionButton
            onPress={handleOpenCreate}
            icon={Plus}
            label={t('staff_dir_add', 'Add Staff')}
            accessibilityLabel="Add New Staff Member"
          />
        ) : undefined
      }
    >
      {toastNode}

      {/* Search & Filter Header */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('staff_dir_search', 'Search by name, phone, or code...')}
        onFilterPress={() => setShowFilterSheet(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Horizontal Quick Department Filter Chips */}
      <View className="px-4 py-1.5">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row items-center gap-2 pe-4"
        >
          <Chip
            label={t('staff_dir_all', 'All Staff')}
            selected={selectedDepartment === 'ALL'}
            onPress={() => setSelectedDepartment('ALL')}
          />
          {DEPARTMENTS.map((dept) => (
            <Chip
              key={dept}
              label={dept}
              selected={selectedDepartment === dept}
              onPress={() => setSelectedDepartment(dept)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Metrics Row: Total Staff, On-Site, Active, Vendors */}
      <View className="flex-row gap-2 px-4 py-2">
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            {t('staff_dir_total', 'Total Staff')}
          </Text>
          <Text className="text-sm font-bold text-foreground mt-0.5" numberOfLines={1}>
            {metrics.total}
          </Text>
        </View>
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            {t('staff_dir_on_site', 'On-Site')}
          </Text>
          <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5" numberOfLines={1}>
            {onSiteCount}
          </Text>
        </View>
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            {t('staff_dir_active', 'Active')}
          </Text>
          <Text className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5" numberOfLines={1}>
            {metrics.active}
          </Text>
        </View>
        <View className="flex-1 py-2 px-1 rounded-xl bg-card border border-border items-center justify-center min-w-0">
          <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>
            {t('staff_dir_vendors', 'Vendors')}
          </Text>
          <Text className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5" numberOfLines={1}>
            {metrics.vendor}
          </Text>
        </View>
      </View>

      {/* Main Staff Registry List */}
      <FlatList
        className="flex-1"
        data={staffList}
        keyExtractor={(item) => item._id}
        contentContainerClassName="p-4 pt-1 pb-24"
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
        ListHeaderComponent={
          error ? (
            <View className="mb-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex-row items-center justify-between">
              <Text className="text-xs text-destructive font-medium flex-1 mr-2">{error}</Text>
              <TouchableOpacity onPress={clearError} accessibilityRole="button" accessibilityLabel="Dismiss error">
                <Text className="text-xs text-destructive font-bold">{t('staff_dir_dismiss', 'Dismiss')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonLoader count={4} />
          ) : (
            <EmptyState
              title={t('staff_dir_empty_title', 'No Staff Members Found')}
              description={
                searchQuery || activeFilterCount > 0
                  ? t('staff_dir_empty_filtered', 'Try adjusting your search criteria or resetting filters.')
                  : t('staff_dir_empty_none', 'No staff members have been registered in this community yet.')
              }
              actionLabel={activeFilterCount > 0 ? 'Clear Filters' : undefined}
              onAction={activeFilterCount > 0 ? handleResetFilters : undefined}
            />
          )
        }
        renderItem={({ item }) => (
          <StaffCard
            member={item}
            canManage={hasManagePermission}
            onPress={handleOpenDetail}
            onEdit={handleOpenEdit}
            onDelete={handleAskDelete}
          />
        )}
      />

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
            setShowDetailModal(false);
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
        title={t('staff_dir_delete_title', 'Delete Staff Member')}
        message={buildStaffDeleteMessage(deletingStaff?.name, deleteUnitCount, t)}
        confirmLabel={t('staff_dir_delete_confirm', 'Delete')}
        cancelLabel={t('staff_dir_cancel', 'Cancel')}
        variant="danger"
        loading={isSubmitting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingStaff(null)}
      />
    </ScreenShell>
  );
};

export default StaffDirectoryScreen;
