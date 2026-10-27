import React, { useState, useRef, Suspense, lazy } from 'react';
import { View, FlatList, RefreshControl, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Filter, Users, Mail, Users2, Plus, UserPlus, X } from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/common/Button';
import { useTranslation } from '@/src/utils/i18n';
import {
  useUserList,
  UserCard,
  UserFilterSheet,
  UserData,
  AssignedUnit,
} from '@/src/features/userManagement';
import { AppLoader } from '@/components/ui/AppLoader';
import { Text } from '@/components/ui/text';
import { DraggableSpeedDial, SpeedDialAction } from '@/components/ui/DraggableSpeedDial';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

// Lazy Load Heavy Modals for Performance Optimization
const InviteUserModal = lazy(() => import('@/src/features/userManagement').then(m => ({ default: m.InviteUserModal })));
const BulkInviteModal = lazy(() => import('@/src/features/userManagement').then(m => ({ default: m.BulkInviteModal })));
const ConfigureInviteTemplateModal = lazy(() => import('@/src/features/userManagement').then(m => ({ default: m.ConfigureInviteTemplateModal })));
const ManageRolesModal = lazy(() => import('@/src/features/userManagement').then(m => ({ default: m.ManageRolesModal })));
const EditUserModal = lazy(() => import('@/src/features/userManagement').then(m => ({ default: m.EditUserModal })));

export default function UserManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const canInviteUsers = Boolean(
    user?.isPlatform || user?.permissions?.includes('*') || user?.permissions?.includes('users:create')
  );

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
    bulkInviteUsers,
    editUser,
    selectedUserForRoles,
    selectedUnitForRoles,
    openManageRolesModal,
    closeManageRolesModal,
    handleSaveRoles,
    isLoading,
    error,
    refreshUsers,
    loadMoreUsers,
  } = useUserList();

  // Local UI State
  // Speed Dial Actions for DraggableSpeedDial
  const speedDialActions: SpeedDialAction[] = [
    {
      id: 'invite_user',
      label: t('invite_user', 'Invite User'),
      icon: <UserPlus size={22} className="text-primary" />,
      accessibilityLabel: t('invite_user', 'Invite User'),
      onPress: () => {
        if (canInviteUsers) {
          setShowInviteModal(true);
        } else {
          Alert.alert('Permission required', 'Your role cannot invite users.');
        }
      },
    },
    {
      id: 'bulk_create',
      label: t('bulk_create', 'Bulk Create'),
      icon: <Users size={22} className="text-primary" />,
      accessibilityLabel: t('bulk_create', 'Bulk Create'),
      onPress: () => {
        if (canInviteUsers) {
          setShowBulkInviteModal(true);
        } else {
          Alert.alert('Permission required', 'Your role cannot invite users.');
        }
      },
    },
    {
      id: 'email_template',
      label: t('email_template', 'Email Template'),
      icon: <Mail size={22} className="text-primary" />,
      accessibilityLabel: t('email_template', 'Email Template'),
      onPress: () => setShowTemplateModal(true),
    },
  ];

  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserData | null>(null);
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
      // The invite modal needs the created user (id, invite link), e.g. to attach an optional staff photo.
      return result;
    } catch (err: any) {
      Alert.alert('Invite Error', err?.message || 'Failed to invite user');
      throw err;
    }
  };

  const handleResendInvite = (user: UserData) => {
    handleSendInvite({
      name: user.name || '',
      email: user.email,
      phone: (user as any).phone || '',
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

  const activeFilterCount = (selectedRoles?.length || 0) + (statusFilter?.length < 3 ? 1 : 0);

  // Infinite Scroll Footer Component
  const renderPaginationFooter = () => {
    if (!isLoading || users.length === 0) return null;
    return (
      <View className="mt-3 py-4 items-center justify-center">
        <AppLoader variant="inline" />
      </View>
    );
  };

  return (
    <ScreenShell
      title={t('feature_admin_users_name', 'User Management')}
      subtitle={t('residents_and_staff', 'Residents & Staff')}
      iconName="Users"
      domainName="Administration & Security"
      sharedSlice="userSlice.ts"
      loading={false}
      error={error}
      onRetry={refreshUsers}
      headerRight={
        canInviteUsers ? (
          <HeaderActionButton
            onPress={() => setShowInviteModal(true)}
            icon={UserPlus}
            label={t('invite_user', 'Invite User')}
            accessibilityRole="button"
            accessibilityLabel={t('invite_user', 'Invite User')}
          />
        ) : undefined
      }
    >
      <View className="flex-1 bg-background">
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('search_users_placeholder', 'Search users, email, unit...')}
          onFilterPress={() => setShowFilterSheet(true)}
          activeFilterCount={activeFilterCount}
        />

        {/* Premium Pill Tabs */}
        <View className="pb-3 border-b border-border/30">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerClassName="px-4 gap-2.5"
          >
            {['All', 'Resident', 'Guard', 'Staff'].map((tabRole) => {
              const isActive = tabRole === 'All' 
                ? selectedRoles.length === 0 
                : selectedRoles.includes(tabRole);
              
              return (
                <TouchableOpacity
                  key={tabRole}
                  onPress={() => {
                    clearRoleFilter();
                    if (tabRole !== 'All') {
                      toggleRole(tabRole);
                    }
                  }}
                  className={`py-2 px-5 rounded-full border transition-all flex-row items-center justify-center ${
                    isActive 
                      ? 'bg-primary border-primary shadow-sm' 
                      : 'bg-card border-border/60'
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text className={`text-[13px] font-bold tracking-wide ${
                    isActive ? 'text-white' : 'text-muted-foreground'
                  }`}>
                    {tabRole === 'All' ? t('all_users', 'All Users') : tabRole}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List Content */}
        {isLoading && users.length === 0 ? (
          <View className="p-3">
            <SkeletonLoader count={4} variant="card" />
          </View>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('no_users_found', 'No Users Found')}
            description={
              searchQuery || selectedRoles.length > 0
                ? t('no_users_match', 'No users match your active search or filter criteria.')
                : t('no_users_registered', 'No community users registered yet. Tap the button below to bulk create users.')
            }
            actionLabel={t('bulk_create', 'Bulk Create')}
            onAction={() => canInviteUsers ? setShowBulkInviteModal(true) : Alert.alert('Permission required', 'Your role cannot invite users.')}
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={users}
            keyExtractor={(item) => item.id || item._id || item.email}
            renderItem={({ item }) => (
              <UserCard
                user={item}
                currentUserId={currentUserId}
                onManageRoles={(u: UserData, unit?: AssignedUnit | null) => openManageRolesModal(u, unit)}
                onDeleteUser={(u: UserData) => setUserToDelete(u)}
                onViewDetails={(u: UserData) => setUserToEdit(u)}
              />
            )}
            contentContainerClassName="p-3 pb-40"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            alwaysBounceVertical={true}
            bounces={true}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreUsers}
            onEndReachedThreshold={0.5}
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

      {/* Physics-based Draggable Speed Dial FAB */}
      <DraggableSpeedDial
        actions={speedDialActions}
        initialBottom={24}
        initialRight={20}
        accessibilityLabel={t('user_actions', 'User Actions')}
      />

      {/* Modals & Bottom Sheets */}
      {/* Lazy Loaded Heavy Modals & Bottom Sheets */}
      <Suspense fallback={null}>
        {userToEdit && (
          <EditUserModal
            visible={!!userToEdit}
            user={userToEdit}
            onClose={() => setUserToEdit(null)}
            onSave={async (id, data) => {
              await editUser(id, data);
              Alert.alert('Success', 'Profile updated successfully.');
            }}
          />
        )}

        

        {showInviteModal && (
          <InviteUserModal
            visible={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onSendInvite={handleSendInvite}
          />
        )}

        {showBulkInviteModal && (
          <BulkInviteModal
            visible={showBulkInviteModal}
            onClose={() => setShowBulkInviteModal(false)}
            onBulkInvite={bulkInviteUsers}
          />
        )}

        {showTemplateModal && (
          <ConfigureInviteTemplateModal
            visible={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
          />
        )}

        {selectedUserForRoles && (
          <ManageRolesModal
            visible={!!selectedUserForRoles}
            user={selectedUserForRoles}
            unit={selectedUnitForRoles}
            onClose={closeManageRolesModal}
            onSave={handleSaveRoles}
            availableRoles={ROLES}
          />
        )}
      </Suspense>

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

      {/* Delete User Confirmation Modal */}
      <ConfirmationModal
        visible={!!userToDelete}
        title={t('delete_user_title', 'Delete User')}
        message={`${t('delete_user_confirm', 'Are you sure you want to delete user')} "${userToDelete?.name}"? ${t('action_cannot_be_undone', 'This action cannot be undone.')}`}
        confirmLabel={t('role_delete', 'Delete')}
        cancelLabel={t('cancel', 'Cancel')}
        variant="danger"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        loading={deleting}
      />
    </ScreenShell>
  );
}
