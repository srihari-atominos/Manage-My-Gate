import React from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { FAB } from '@/components/ui/FAB';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { TextInput } from '@/components/forms/TextInput';
import { useResidentStaffAssociation } from '../hooks/useResidentStaffAssociation';
import { UnitStaffCard } from '../components/UnitStaffCard';
import { AssociateStaffModal } from '../components/AssociateStaffModal';
import { UsersRound, Search, Plus, Home } from 'lucide-react-native';

interface ResidentStaffScreenProps {
  embeddedMode?: boolean;
}

export const ResidentStaffScreen: React.FC<ResidentStaffScreenProps> = ({ embeddedMode = false }) => {
  const {
    myUnits,
    eligibleStaff,
    filteredAssociations,
    selectedVillaId,
    setSelectedVillaId,
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
            <RefreshControl refreshing={isLoading} onRefresh={loadData} />
          }
        >
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
              actionLabel={
                hasAssignPermission && !searchQuery && selectedVillaId === 'all'
                  ? '+ Associate Staff'
                  : undefined
              }
              onAction={() => setIsAssociateModalOpen(true)}
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

        {/* Floating Action Button for Adding Staff */}
        {hasAssignPermission && (
          <FAB
            label="Associate Staff"
            iconName="Plus"
            onPress={() => setIsAssociateModalOpen(true)}
          />
        )}

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
    >
      {content}
    </ScreenShell>
  );
};

export default ResidentStaffScreen;
