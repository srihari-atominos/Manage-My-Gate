import React, { useState, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, Alert, Modal } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, Hash, X } from 'lucide-react-native';
import { ScreenShell } from '../../../components/ui/ScreenShell';
import { SearchFilterBar } from '../../../components/ui/SearchFilterBar';
import { PaginatedList } from '../../../components/ui/PaginatedList';
import { FAB } from '../../../components/ui/FAB';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { ErrorBanner } from '../../../components/feedback/ErrorBanner';
import { Button } from '../../../components/ui/button';
import { Icon } from '../../../components/ui/icon';
import { Text } from '../../../components/ui/text';
import { TextInput } from '../../../components/forms/TextInput';
import { useRoles } from '../../../src/features/roleBuilder/hooks/useRoles';
import { useRoleSocket } from '../../../src/features/roleBuilder/hooks/useRoleSocket';
import { RoleCard } from '../../../src/features/roleBuilder/components/RoleCard';
import { RoleFormSheetModal } from '../../../src/features/roleBuilder/components/RoleFormSheetModal';

export default function RoleBuilderScreen() {
  // Listen for realtime socket events
  useRoleSocket();

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

  // Scope Filter Chips State
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'TENANT' | 'GLOBAL'>('ALL');
  const [showPageJumpModal, setShowPageJumpModal] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState('');

  // Compute Statistics for Filter Tab Counts
  const stats = useMemo(() => {
    const list = roles || [];
    const globalCount = list.filter((r) => !r.isTenantRole).length;
    const unitCount = list.filter((r) => r.isTenantRole === true).length;
    return {
      total: list.length,
      global: globalCount,
      unit: unitCount,
    };
  }, [roles]);

  const filteredRoles = useMemo(() => {
    return (roles || []).filter((role) => {
      if (scopeFilter === 'TENANT') {
        return role.isTenantRole === true;
      }
      if (scopeFilter === 'GLOBAL') {
        return !role.isTenantRole;
      }
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

  // Record Range Calculations
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

  // Clean Native List Header matching User Management UI
  const renderListHeader = useCallback(() => {
    return (
      <View className="gap-2.5 mb-2">
        {/* Error Alert Banner */}
        {error ? (
          <ErrorBanner
            title="Role Operation Failed"
            message={error}
            onRetry={handleRefresh}
            onDismiss={dismissError}
          />
        ) : null}

        {/* User Management Search Filter Bar */}
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={handleSearch}
          searchPlaceholder="Search roles by name or scope..."
        />

        {/* Filter Chips Bar */}
        <View className="flex-row items-center gap-1.5 py-0.5">
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
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {tab.label}
                </Text>
                <View
                  className={`px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-primary-foreground/20'
                      : 'bg-muted-foreground/15'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary & Rows Per Page Top Toolbar matching User Management */}
        <View className="px-3 py-1.5 flex-row items-center justify-between border-y border-border/40 bg-muted/20 rounded-lg">
          <Text className="text-[11px] font-semibold text-muted-foreground text-start">
            Showing <Text className="font-bold text-foreground">{startRecord}-{endRecord}</Text> of <Text className="font-bold text-foreground">{totalRecords}</Text> Roles
          </Text>

          <View className="flex-row items-center gap-1">
            <Text className="text-[10px] font-semibold text-muted-foreground me-0.5">
              Rows:
            </Text>
            {[10, 20, 50, 100].map((limit) => (
              <TouchableOpacity
                key={limit}
                onPress={() => setRowsPerPage(limit)}
                className={`px-1.5 py-0.5 rounded-md border active:opacity-70 ${
                  rowsPerPage === limit
                    ? 'bg-primary border-primary'
                    : 'bg-background border-border/60'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    rowsPerPage === limit ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {limit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }, [
    error,
    handleRefresh,
    dismissError,
    searchQuery,
    handleSearch,
    scopeFilter,
    stats,
    startRecord,
    endRecord,
    totalRecords,
    rowsPerPage,
    setRowsPerPage,
  ]);

  // Pagination Footer Component matching User Management UI
  const renderPaginationFooter = () => {
    if (totalRecords === 0) return null;

    return (
      <View className="mt-3 pt-2.5 border-t border-border/40">
        <View className="flex-row items-center justify-between bg-card border border-border/60 p-2 rounded-xl shadow-xs">
          <TouchableOpacity
            onPress={() => {
              if (currentPage > 1) setCurrentPage(currentPage - 1);
            }}
            disabled={currentPage <= 1 || isLoading}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
              currentPage <= 1 || isLoading
                ? 'bg-muted/40 border-border/40 opacity-40'
                : 'bg-primary/10 border-primary/20 active:opacity-70'
            }`}
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
          >
            <Text className="text-xs font-bold text-foreground">
              Page {currentPage} of {totalPages}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
            }}
            disabled={currentPage >= totalPages || isLoading}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
              currentPage >= totalPages || isLoading
                ? 'bg-muted/40 border-border/40 opacity-40'
                : 'bg-primary/10 border-primary/20 active:opacity-70'
            }`}
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
      title="Role Builder"
      subtitle="Configure access roles & RBAC"
      iconName="ShieldCheck"
      domainName="Administration & Security"
      sharedSlice="roleSlice.ts"
      headerRight={
        <TouchableOpacity
          onPress={openCreateModal}
          activeOpacity={0.8}
          className="w-8 h-8 rounded-xl bg-primary items-center justify-center shadow-xs"
        >
          <Icon as={Plus} size={18} className="text-primary-foreground" />
        </TouchableOpacity>
      }
    >
      <View className="flex-1 bg-background">
        <PaginatedList
          data={filteredRoles}
          loading={isLoading}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          onLoadMore={() => {
            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
          }}
          pagination={{
            currentPage,
            totalPages,
            totalRecords: filteredRoles.length,
            limit: rowsPerPage,
          }}
          keyExtractor={(item: any) => item.id || item._id || String(Math.random())}
          ListHeaderComponent={renderListHeader()}
          contentContainerClassName="px-3.5 pt-3 pb-28"
          renderItem={(item: any) => (
            <View className="mb-2.5">
              <RoleCard
                role={item}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
              />
            </View>
          )}
          emptyTitle={searchQuery ? 'No Matching Roles' : 'No Roles Configured'}
          emptySubtitle={
            searchQuery
              ? `No roles found matching "${searchQuery}".`
              : 'Create your first system security role to manage access permissions.'
          }
        />

        {renderPaginationFooter()}
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

      {/* Direct Page Jump Modal matching User Management */}
      <Modal
        visible={showPageJumpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPageJumpModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPageJumpModal(false)}
          className="flex-1 bg-black/60 items-center justify-center p-4"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-card border border-border rounded-2xl p-5 shadow-xl"
          >
            <View className="flex-row items-center justify-between mb-3 border-b border-border/60 pb-2">
              <View className="flex-row items-center">
                <Hash size={18} color="#6366f1" className="me-2" />
                <Text className="text-base font-bold text-foreground">Jump to Page</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPageJumpModal(false)}>
                <X size={18} className="text-muted-foreground" />
              </TouchableOpacity>
            </View>

            <TextInput
              label={`Target Page Number (1-${totalPages})`}
              value={targetPageInput}
              onChangeText={setTargetPageInput}
              keyboardType="number-pad"
              placeholder={`Enter 1-${totalPages}`}
              autoFocus
            />

            <View className="flex-row items-center gap-2 mt-4">
              <Button
                variant="outline"
                onPress={() => setShowPageJumpModal(false)}
                className="flex-1 rounded-xl"
              >
                <Text className="text-xs font-semibold text-foreground">Cancel</Text>
              </Button>
              <Button
                variant="default"
                onPress={handleExecutePageJump}
                className="flex-1 rounded-xl"
              >
                <Text className="text-xs font-bold text-primary-foreground">Jump</Text>
              </Button>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenShell>
  );
}
