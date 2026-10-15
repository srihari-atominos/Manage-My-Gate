import React from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { FAB } from '@/components/ui/FAB';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { TextInput } from '@/components/forms/TextInput';
import { useResidentStaffAssociation } from '../hooks/useResidentStaffAssociation';
import { UnitStaffCard } from '../components/UnitStaffCard';
import { StaffInsideNowCard } from '../components/StaffInsideNowCard';
import { useStaffInsideNow } from '../hooks/useStaffInsideNow';
import { AssociateStaffModal } from '../components/AssociateStaffModal';
import { UsersRound, Search, Plus, Home } from 'lucide-react-native';

interface ResidentStaffScreenProps {
  embeddedMode?: boolean;
}

export const ResidentStaffScreen: React.FC<ResidentStaffScreenProps> = ({ embeddedMode = false }) => {
  const {
    myUnits,
    eligibleStaff,
    associations,
    filteredAssociations,
    selectedVillaId,
    setSelectedVillaId,
    selectedStatusTab,
    setSelectedStatusTab,
    activeCount,
    pendingCount,
    isSuccessModalOpen,
    setIsSuccessModalOpen,
    successModalMessage,
    searchQuery,
    setSearchQuery,
    isLoading,
    isSubmitting,
    error,
    isAssociateModalOpen,
    setIsAssociateModalOpen,
    isRemoveModalOpen,
    targetAssociationToRemove,
    hasAssignPermission,
    loadData,
    handleCreateAssociation,
    handleRemoveAssociation,
    openRemoveModal,
    closeRemoveModal,
    clearError,
  } = useResidentStaffAssociation();

  const { staffInside, refresh: refreshStaffInside } = useStaffInsideNow(hasAssignPermission);

  const removeModalMessage = targetAssociationToRemove
    ? `Are you sure you want to remove ${targetAssociationToRemove.technicianId?.name || 'this staff member'} from ${targetAssociationToRemove.villaId?.unitNumber || 'your unit'}? The staff profile will remain in the community registry.`
    : 'Are you sure you want to remove this staff association?';

  const content = (
    <View className="flex-1 bg-background">
        {/* Error Banner */}
        {error && (
          <View className="mx-4 mt-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex-row items-center justify-between">
            <Text className="text-xs font-medium text-destructive flex-1 me-2">
              {error}
            </Text>
            <Pressable onPress={clearError}>
              <Text className="text-xs font-bold text-destructive">Dismiss</Text>
            </Pressable>
          </View>
        )}

        {/* Search & Unit Filters Header */}
        <View className="p-4 pb-2 border-b border-border/50 bg-card/50">
          {/* Search bar */}
          <TextInput
            placeholder="Search by staff name, role, unit..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={Search}
            clearable
            onClear={() => setSearchQuery('')}
            containerClassName="mb-3"
          />

          {/* Status Tabs (All, Active, Pending Approval) */}
          <View className="flex-row items-center gap-2 mb-3">
            <Pressable
              onPress={() => setSelectedStatusTab('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-xl border items-center justify-center ${
                selectedStatusTab === 'ALL'
                  ? 'bg-primary border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedStatusTab === 'ALL' ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                All Staff ({associations.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedStatusTab('Active')}
              className={`flex-1 py-1.5 px-2 rounded-xl border items-center justify-center ${
                selectedStatusTab === 'Active'
                  ? 'bg-primary border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedStatusTab === 'Active' ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                Active ({activeCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedStatusTab('Pending')}
              className={`flex-1 py-1.5 px-2 rounded-xl border items-center justify-center ${
                selectedStatusTab === 'Pending'
                  ? 'bg-amber-500 border-amber-500'
                  : 'bg-card border-border'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedStatusTab === 'Pending'
                    ? 'text-white font-bold'
                    : pendingCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground'
                }`}
              >
                Pending ({pendingCount})
              </Text>
            </Pressable>
          </View>

          {/* Unit Chips (shown when resident has multiple units) */}
          {myUnits.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row gap-2 py-1"
            >
              <Pressable
                onPress={() => setSelectedVillaId('all')}
                className={`px-3 py-1.5 rounded-full border ${
                  selectedVillaId === 'all'
                    ? 'bg-primary border-primary'
                    : 'bg-card border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedVillaId === 'all' ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  All Units ({myUnits.length})
                </Text>
              </Pressable>

              {myUnits.map((unit) => {
                const isSelected = selectedVillaId === unit._id;
                const label = `${unit.unitNumber}${unit.blockOrBuilding ? ` (${unit.blockOrBuilding})` : ''}`;
                return (
                  <Pressable
                    key={unit._id}
                    onPress={() => setSelectedVillaId(unit._id)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <Home
                      size={12}
                      className={isSelected ? 'text-primary-foreground me-1.5' : 'text-muted-foreground me-1.5'}
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Main Content Area */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-4 pb-32"
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                loadData();
                refreshStaffInside();
              }}
            />
          }
        >
          <StaffInsideNowCard staff={staffInside} />

          {filteredAssociations.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title={
                searchQuery || selectedVillaId !== 'all'
                  ? 'No Matching Staff'
                  : 'No Household Staff'
              }
              description={
                searchQuery || selectedVillaId !== 'all'
                  ? 'No staff associations match your current filter criteria.'
                  : 'You have not associated any staff members with your unit yet. Associate trusted drivers, maids, cooks, or cleaners.'
              }
              actionLabel={undefined}
              onAction={undefined}
            />
          ) : (
            filteredAssociations.map((assoc) => (
              <UnitStaffCard
                key={assoc._id}
                association={assoc}
                canManage={hasAssignPermission}
                onRemove={() => openRemoveModal(assoc)}
              />
            ))
          )}
        </ScrollView>


        {/* Association Creation Bottom Sheet */}
        <AssociateStaffModal
          visible={isAssociateModalOpen}
          myUnits={myUnits}
          eligibleStaff={eligibleStaff}
          isSubmitting={isSubmitting}
          onClose={() => setIsAssociateModalOpen(false)}
          onSubmit={handleCreateAssociation}
        />

        {/* Confirmation Modal for Removal */}
        <ConfirmationModal
          visible={isRemoveModalOpen}
          title="Remove Staff Association"
          message={removeModalMessage}
          confirmLabel="Remove"
          cancelLabel="Keep Staff"
          variant="danger"
          loading={isSubmitting}
          onConfirm={() => handleRemoveAssociation('Deactivated by resident')}
          onCancel={closeRemoveModal}
        />

        {/* Success Confirmation Modal after Association Submission */}
        <ConfirmationModal
          visible={isSuccessModalOpen}
          title="Invitation Sent Successfully"
          message={
            successModalMessage ||
            'The staff association request has been sent. The staff member can now review and accept this allocation request on their Staff Portal.'
          }
          confirmLabel="Done"
          variant="success"
          onConfirm={() => setIsSuccessModalOpen(false)}
          onCancel={() => setIsSuccessModalOpen(false)}
        />
      </View>
  );

  if (embeddedMode) {
    return content;
  }

  return (
    <ScreenShell
      title="My Unit Staff"
      subtitle="Household & Private Associates"
      iconName="UsersRound"
      showBackButton
      headerRight={
        hasAssignPermission ? (
          <Button
            size="sm"
            variant="default"
            className="h-9 px-3 flex-row items-center gap-1 shadow-xs"
            onPress={() => setIsAssociateModalOpen(true)}
            accessibilityLabel="Associate Staff to Unit"
          >
            <Plus size={16} className="text-primary-foreground" />
            <Text className="text-xs font-bold text-primary-foreground">Associate Staff</Text>
          </Button>
        ) : undefined
      }
    >
      {content}
    </ScreenShell>
  );
};

export default ResidentStaffScreen;
