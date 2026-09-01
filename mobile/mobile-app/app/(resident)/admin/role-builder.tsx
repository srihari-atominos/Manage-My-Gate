import React, { useState, useMemo } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, Hash, X } from 'lucide-react-native';
import { ScreenShell } from '../../../components/ui/ScreenShell';
import { SearchFilterBar } from '../../../components/ui/SearchFilterBar';
import { FAB } from '../../../components/ui/FAB';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { SkeletonLoader } from '../../../components/feedback/SkeletonLoader';
import { Button } from '../../../components/ui/button';
import { Icon } from '../../../components/ui/icon';
import { Text } from '../../../components/ui/text';
import { TextInput } from '../../../components/forms/TextInput';
import { useTranslation } from '../../../src/utils/i18n';
import { useRoles } from '../../../src/features/roleBuilder/hooks/useRoles';
import { useRoleSocket } from '../../../src/features/roleBuilder/hooks/useRoleSocket';
import { RoleCard } from '../../../src/features/roleBuilder/components/RoleCard';
import { RoleFormSheetModal } from '../../../src/features/roleBuilder/components/RoleFormSheetModal';

export default function RoleBuilderScreen() {
  useRoleSocket();
  const { t } = useTranslation();

  const {
    roles = [],
    isLoading = false,
    isPermissionsLoading = false,
    error = null,
    permissionsList = {},
    totalRecords = 0,
    currentPage = 1,
    totalPages = 1,
    rowsPerPage = 10,
    isFormModalOpen = false,
    isDeleteModalOpen = false,
    selectedRole = null,
    searchQuery = '',
    openCreateModal,
    openEditModal,
    closeFormModal,
    openDeleteModal,
    closeDeleteModal,
    handleSaveRole,
    handleConfirmDeleteRole,
    handleRefresh,
    handleSearch,
    setCurrentPage,
    setRowsPerPage,
    loadPermissions,
    dismissError,
  } = useRoles();

  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'TENANT' | 'GLOBAL'>('ALL');
  const [showPageJumpModal, setShowPageJumpModal] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState('');

  const stats = useMemo(() => {
    const list = roles || [];
    return {
      total: list.length,
      global: list.filter((r) => !r.isTenantRole).length,
      unit: list.filter((r) => r.isTenantRole === true).length,
    };
  }, [roles]);

  const filteredRoles = useMemo(() => {
    return (roles || []).filter((role) => {
      if (scopeFilter === 'TENANT') return role.isTenantRole === true;
      if (scopeFilter === 'GLOBAL') return !role.isTenantRole;
      return true;
    });
  }, [roles, scopeFilter]);

  const handleExecutePageJump = () => {
    const pageNum = parseInt(targetPageInput.trim(), 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setShowPageJumpModal(false);
      setTargetPageInput('');
    } else {
      Alert.alert('Invalid Page', `Please enter a valid page number between 1 and ${totalPages}.`);
    }
  };

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

  // Pagination Footer matching User Management exactly
  const renderPaginationFooter = () => {
    if (totalRecords === 0) return null;
    return (
      <View className="mt-3 pt-2.5 border-t border-border/40">
        <View className="flex-row items-center justify-between bg-card border border-border/60 p-2 rounded-xl shadow-xs">
          <TouchableOpacity
            onPress={() => { if (currentPage > 1) setCurrentPage(currentPage - 1); }}
            disabled={currentPage <= 1 || isLoading}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
              currentPage <= 1 || isLoading
                ? 'bg-muted/40 border-border/40 opacity-40'
                : 'bg-primary/10 border-primary/20 active:opacity-70'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Previous page"
          >
            <ChevronLeft size={16} color={currentPage <= 1 || isLoading ? '#9ca3af' : '#6366f1'} className="me-1" />
            <Text className={`text-xs font-bold ${currentPage <= 1 || isLoading ? 'text-muted-foreground' : 'text-primary'}`}>
              Prev
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (totalPages > 1) {
                setTargetPageInput(String(currentPage));
                setShowPageJumpModal(true);
              }
            }}
            disabled={totalPages <= 1}
            className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60 flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="Current page"
          >
            <Text className="text-xs font-bold text-foreground">
              Page {currentPage} of {totalPages}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
            disabled={currentPage >= totalPages || isLoading}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
              currentPage >= totalPages || isLoading
                ? 'bg-muted/40 border-border/40 opacity-40'
                : 'bg-primary/10 border-primary/20 active:opacity-70'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Next page"
          >
            <Text className={`text-xs font-bold me-1 ${currentPage >= totalPages || isLoading ? 'text-muted-foreground' : 'text-primary'}`}>
              Next
            </Text>
            <ChevronRight size={16} color={currentPage >= totalPages || isLoading ? '#9ca3af' : '#6366f1'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenShell
      title={t('feature_admin_role_builder_name', 'Role Builder')}
      subtitle={t('feature_admin_role_builder_sub', 'Configure access roles & RBAC')}
      iconName="ShieldCheck"
      domainName="Administration & Security"
      sharedSlice="roleSlice.ts"
      loading={false}
      error={error}
      onRetry={handleRefresh}
      headerRight={
        <TouchableOpacity
          onPress={openCreateModal}
          className="p-2 rounded-xl bg-muted/60 border border-border flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Add role"
        >
          <Plus size={16} color="#6366f1" />
        </TouchableOpacity>
      }
    >
      <View className="flex-1">
        {/* Search & Filter Bar (outside list, matching User Management) */}
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={handleSearch}
          searchPlaceholder="Search roles by name or scope..."
        />

        {/* Scope Filter Chips (below search bar, outside list) */}
        <View className="px-3 py-1.5 flex-row items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Roles', count: stats.total },
            { id: 'GLOBAL', label: 'Global', count: stats.global },
            { id: 'TENANT', label: 'Unit Scope', count: stats.unit },
          ].map((tab) => {
            const isActive = scopeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setScopeFilter(tab.id as any)}
                activeOpacity={0.8}
                className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary border-primary shadow-xs'
                    : 'bg-card border-border/80'
                }`}
              >
                <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-foreground'}`}>
                  {tab.label}
                </Text>
                <View className={`px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20' : 'bg-muted-foreground/15'}`}>
                  <Text className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary & Rows-Per-Page Selector (matching User Management exactly) */}
        <View className="px-3 py-1.5 flex-row items-center justify-between border-b border-border/40 bg-muted/20">
          <Text className="text-[11px] font-semibold text-muted-foreground text-start">
            Showing <Text className="font-bold text-foreground">{startRecord}-{endRecord}</Text> of <Text className="font-bold text-foreground">{totalRecords}</Text> Roles
          </Text>

          <View className="flex-row items-center gap-1">
            <Text className="text-[10px] font-semibold text-muted-foreground me-0.5">Rows:</Text>
            {[10, 20, 50, 100].map((limit) => (
              <TouchableOpacity
                key={limit}
                onPress={() => setRowsPerPage(limit)}
                className={`px-1.5 py-0.5 rounded-md border active:opacity-70 ${
                  rowsPerPage === limit ? 'bg-primary border-primary' : 'bg-background border-border/60'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Set ${limit} rows per page`}
              >
                <Text className={`text-[10px] font-bold ${rowsPerPage === limit ? 'text-white' : 'text-foreground'}`}>
                  {limit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List Content (matching User Management: FlatList, not PaginatedList) */}
        {isLoading && filteredRoles.length === 0 ? (
          <View className="p-3">
            <SkeletonLoader count={4} variant="card" />
          </View>
        ) : filteredRoles.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No Matching Roles' : 'No Roles Configured'}
            description={
              searchQuery
                ? `No roles found matching "${searchQuery}".`
                : 'No roles configured yet. Tap the button below to create your first role.'
            }
            actionLabel="Create Role"
            onAction={openCreateModal}
          />
        ) : (
          <FlatList
            data={filteredRoles}
            keyExtractor={(item) => item.id || item._id || String(Math.random())}
            renderItem={({ item }) => (
              <RoleCard
                role={item}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
              />
            )}
            contentContainerClassName="p-2.5 pb-28"
            ListFooterComponent={renderPaginationFooter}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                colors={['#6366f1']}
                tintColor="#6366f1"
              />
            }
          />
        )}
      </View>

      {/* Floating Action Button */}
      <FAB iconName="Plus" onPress={openCreateModal} />

      {/* Create / Edit Form Sheet Modal */}
      <RoleFormSheetModal
        visible={isFormModalOpen}
        role={selectedRole}
        permissionsList={permissionsList}
        isPermissionsLoading={isPermissionsLoading}
        onClose={closeFormModal}
        onSave={handleSaveRole}
        onLoadPermissions={loadPermissions}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={isDeleteModalOpen}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${selectedRole?.name}"? This action will revoke access for assigned users.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={isLoading}
        onConfirm={handleConfirmDeleteRole}
        onCancel={closeDeleteModal}
      />

      {/* Quick Jump To Page Modal (matching User Management exactly) */}
      <Modal visible={showPageJumpModal} transparent animationType="fade" onRequestClose={() => setShowPageJumpModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-card rounded-2xl p-5 border border-border w-full max-w-xs shadow-lg">
            <View className="flex-row items-center justify-between pb-2 border-b border-border mb-3">
              <View className="flex-row items-center">
                <Hash size={18} color="#6366f1" className="me-2" />
                <Text className="text-base font-bold text-foreground">Jump to Page</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPageJumpModal(false)}>
                <X size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-muted-foreground mb-3 text-start">
              Enter page number between <Text className="font-bold text-foreground">1</Text> and <Text className="font-bold text-foreground">{totalPages}</Text>:
            </Text>

            <TextInput
              value={targetPageInput}
              onChangeText={setTargetPageInput}
              placeholder={`1 - ${totalPages}`}
              keyboardType="number-pad"
              autoFocus
              className="mb-4"
            />

            <View className="flex-row items-center justify-end gap-2">
              <Button variant="outline" size="sm" onPress={() => setShowPageJumpModal(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onPress={handleExecutePageJump}>
                Go to Page
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}
