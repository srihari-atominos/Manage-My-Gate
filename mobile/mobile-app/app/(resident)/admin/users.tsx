import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Filter, Users, ChevronLeft, ChevronRight, UserCheck, Hash, X } from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { FAB } from '@/components/ui/FAB';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/common/Button';
import {
  useUserList,
  UserCard,
  InviteUserModal,
  ManageRolesModal,
  UserFilterSheet,
  UserData,
  AssignedUnit,
} from '@/src/features/userManagement';

export default function UserManagementScreen() {
  const router = useRouter();

  // Controller Hook
  const {
    currentUserId,
    searchQuery,
    selectedRoles,
    statusFilter,
    users,
    currentPage,
    rowsPerPage,
    totalRecords,
    totalPages,
    ROLES,
    STATUS_OPTIONS,
    setSearchQuery,
    toggleRole,
    toggleStatus,
    clearRoleFilter,
    setCurrentPage,
    setRowsPerPage,
    deleteUser,
    inviteUser,
    selectedUserForRoles,
    selectedUnitForRoles,
    openManageRolesModal,
    closeManageRolesModal,
    handleSaveRoles,
    isLoading,
    error,
    refreshUsers,
  } = useUserList();

  // Local UI State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showPageJumpModal, setShowPageJumpModal] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast / Alert helper
  const handleSendInvite = async (inviteData: any) => {
    try {
      const result = await inviteUser(inviteData);
      Alert.alert(
        'Invitation Sent',
        result?.invitationToken
          ? `Invitation issued successfully.\nToken: ${result.invitationToken}`
          : 'User invited successfully!'
      );
    } catch (err: any) {
      Alert.alert('Invite Error', err?.message || 'Failed to invite user');
      throw err;
    }
  };

  const handleResendInvite = (user: UserData) => {
    handleSendInvite({
      email: user.email,
      villaId: (user as any).villaId || null,
      residentType: (user as any).residentType || 'None',
      roleName: user.role || null,
    });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const userId = userToDelete.id || userToDelete._id || '';
      await deleteUser({ userId });
      Alert.alert('Success', `User ${userToDelete.name} has been deleted.`);
      setUserToDelete(null);
    } catch (err: any) {
      Alert.alert('Delete Error', err?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

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

  const activeFilterCount = (selectedRoles?.length || 0) + (statusFilter?.length < 3 ? 1 : 0);

  // Record Range Calculations
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

  // Pagination Footer Component
  const renderPaginationFooter = () => {
    if (totalRecords === 0) return null;

    return (
      <View className="mt-3 pt-2.5 border-t border-border/40">
        <View className="flex-row items-center justify-between bg-card border border-border/60 p-2 rounded-xl shadow-xs">
          {/* Previous Page Button (<) */}
          <TouchableOpacity
            onPress={() => {
              if (currentPage > 1) {
                setCurrentPage(currentPage - 1);
              }
            }}
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

          {/* Page Counter & Direct Jump Trigger */}
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

          {/* Next Page Button (>) */}
          <TouchableOpacity
            onPress={() => {
              if (currentPage < totalPages) {
                setCurrentPage(currentPage + 1);
              }
            }}
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
      title="User Management"
      subtitle="Manage organization users & role access"
      iconName="Users"
      domainName="Administration & Security"
      sharedSlice="userSlice.ts"
      loading={false}
      error={error}
      onRetry={refreshUsers}
      headerRight={
        <TouchableOpacity
          onPress={() => setShowFilterSheet(true)}
          className="p-2 rounded-xl bg-muted/60 border border-border flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Filter users"
        >
          <Filter size={16} color="#6366f1" className="me-1" />
          {activeFilterCount > 0 ? (
            <View className="bg-primary px-1.5 py-0.5 rounded-full ms-1">
              <Text className="text-[10px] font-bold text-white">{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      }
    >
      <View className="flex-1">
        {/* Search & Filter Bar */}
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, email, or unit..."
          onFilterPress={() => setShowFilterSheet(true)}
          activeFilterCount={activeFilterCount}
        />

        {/* User Summary & Rows-Per-Page Selector Top Toolbar */}
        <View className="px-3 py-1.5 flex-row items-center justify-between border-b border-border/40 bg-muted/20">
          <Text className="text-[11px] font-semibold text-muted-foreground text-start">
            Showing <Text className="font-bold text-foreground">{startRecord}-{endRecord}</Text> of <Text className="font-bold text-foreground">{totalRecords}</Text> Users
          </Text>

          {/* Inline Rows Per Page Options (10, 20, 50, 100) */}
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
                accessibilityRole="button"
                accessibilityLabel={`Set ${limit} rows per page`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    rowsPerPage === limit ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {limit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List Content */}
        {isLoading && users.length === 0 ? (
          <View className="p-3">
            <SkeletonLoader count={4} variant="card" />
          </View>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description={
              searchQuery || selectedRoles.length > 0
                ? 'No users match your active search or filter criteria.'
                : 'No community users registered yet. Tap the button below to invite users.'
            }
            actionLabel="Invite User"
            onAction={() => setShowInviteModal(true)}
          />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id || item._id || item.email}
            renderItem={({ item }) => (
              <UserCard
                user={item}
                currentUserId={currentUserId}
                onManageRoles={(u: UserData, unit?: AssignedUnit | null) => openManageRolesModal(u, unit)}
                onResendInvite={(u: UserData) => handleResendInvite(u)}
                onDeleteUser={(u: UserData) => setUserToDelete(u)}
              />
            )}
            contentContainerClassName="p-2.5 pb-28"
            ListFooterComponent={renderPaginationFooter}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refreshUsers}
                colors={['#6366f1']}
                tintColor="#6366f1"
              />
            }
          />
        )}
      </View>

      {/* Floating Action Button */}
      <FAB
        iconName="UserPlus"
        label="Invite User"
        onPress={() => setShowInviteModal(true)}
        variant="primary"
      />

      {/* Modals & Bottom Sheets */}
      <InviteUserModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSendInvite={handleSendInvite}
      />

      <ManageRolesModal
        visible={!!selectedUserForRoles}
        user={selectedUserForRoles}
        unit={selectedUnitForRoles}
        onClose={closeManageRolesModal}
        onSave={handleSaveRoles}
        availableRoles={ROLES}
      />

      <UserFilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        availableRoles={ROLES}
        selectedRoles={selectedRoles}
        onToggleRole={toggleRole}
        onClearRoles={clearRoleFilter}
        statusOptions={STATUS_OPTIONS}
        selectedStatuses={statusFilter}
        onToggleStatus={toggleStatus}
      />

      {/* Quick Jump To Page Modal */}
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

      {/* Delete User Confirmation Modal */}
      <ConfirmationModal
        visible={!!userToDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        loading={deleting}
      />
    </ScreenShell>
  );
}
