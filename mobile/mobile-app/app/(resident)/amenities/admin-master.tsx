import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIRow } from '@/components/ui/KPIRow';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/common/Chip';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { FAB } from '@/components/ui/FAB';

import { AmenityMasterCard } from '@/src/features/amenities/components/AmenityMasterCard';
import { useAmenityMaster, ArchetypeFilterOption } from '@/src/features/amenities/hooks/useAmenityMaster';
import {
  AmenityCreationWizard,
  AmenityArchetypeSheet,
} from '@/src/features/amenities/components/creation-wizard';
import { AmenityDetailSheet } from '@/src/features/amenities/components/AmenityDetailSheet';
import { AmenityFacility } from '@/src/features/amenities/types/amenityDomain.types';
import {
  Plus,
  Layers,
  Users,
  Timer,
  Sparkles,
  DoorOpen,
  Wrench,
} from 'lucide-react-native';

interface ArchetypeChipMeta {
  label: string;
  value: ArchetypeFilterOption;
  icon: any;
}

const ARCHETYPE_CHIPS: ArchetypeChipMeta[] = [
  { label: 'All', value: 'All', icon: Layers },
  { label: 'Shared', value: 'SHARED_CAPACITY', icon: Users },
  { label: 'Exclusive', value: 'EXCLUSIVE_HOURLY', icon: Timer },
  { label: 'Event', value: 'EVENT_SPACE', icon: Sparkles },
  { label: 'Room', value: 'ROOM_RESOURCE', icon: DoorOpen },
  { label: 'Tools', value: 'INVENTORY_TOOLS', icon: Wrench },
];

export default function AdminAmenityMasterScreen() {
  const router = useRouter();
  const {
    facilities,
    filteredAmenities,
    search,
    setSearch,
    selectedArchetype,
    setSelectedArchetype,
    loading,
    error,
    isFormModalOpen,
    isArchetypeSheetOpen,
    creationArchetype,
    editingAmenity,
    selectedAmenityDetail,
    setSelectedAmenityDetail,
    deleteTarget,
    setDeleteTarget,
    deactivateTarget,
    setDeactivateTarget,
    saving,
    loadData,
    handleOpenCreateModal,
    handleSelectArchetypeForCreation,
    handleCloseArchetypeSheet,
    handleOpenEditModal,
    handleCloseFormModal,
    handleFormSubmit,
    handleToggleStatus,
    handleConfirmDeactivate,
    handleConfirmDelete,
  } = useAmenityMaster();

  const kpis = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter(
      (f) => f.status === 'ACTIVE' || (f as any).isActive === true
    ).length;
    const maintenance = facilities.filter((f) => f.status === 'MAINTENANCE').length;
    return { total, active, maintenance };
  }, [facilities]);

  const archetypeSortOptions = useMemo(() => {
    return ARCHETYPE_CHIPS.map((chip) => ({
      label: chip.label === 'All' ? 'All Archetypes' : `${chip.label} Capacity`,
      value: chip.value,
    }));
  }, []);

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Facility Summary KPI Strip */}
      <KPIRow
        cards={[
          {
            title: 'Total Amenities',
            value: String(kpis.total),
            subtitle: 'Master Catalog',
            iconName: 'Building2',
            variant: 'info',
            onPress: () => setSelectedArchetype('All'),
          },
          {
            title: 'Active',
            value: String(kpis.active),
            subtitle: 'Open for Booking',
            iconName: 'CheckCircle2',
            variant: 'success',
          },
          {
            title: 'Under Maintenance',
            value: String(kpis.maintenance),
            subtitle: 'Temporary Closed',
            iconName: 'Wrench',
            variant: kpis.maintenance > 0 ? 'warning' : 'default',
            onPress: () => router.push('/(resident)/amenities/maintenance' as any),
          },
        ]}
      />

      {/* Search & Sort Dropdown Filter Bar */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search facility name, location or code..."
        sortOptions={archetypeSortOptions}
        currentSort={selectedArchetype}
        onSortChange={(val) => setSelectedArchetype(val as ArchetypeFilterOption)}
        variant="default"
        className="px-0 py-0 border-0"
      />

      {/* Multi-Chip Archetype Selector Row */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row items-center gap-2 py-0.5"
        >
          {ARCHETYPE_CHIPS.map((chip) => {
            const isSelected = selectedArchetype === chip.value;
            return (
              <Chip
                key={chip.value}
                label={chip.label}
                icon={chip.icon}
                selected={isSelected}
                onPress={() => setSelectedArchetype(chip.value)}
                className="h-8 px-3"
              />
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <ScreenShell
      title="Amenity Master Console"
      subtitle="Configure community facilities, canonical archetypes & pricing"
      iconName="Building2"
      loading={loading && facilities.length === 0}
      error={error}
      onRetry={loadData}
      headerRight={
        <Button
          variant="default"
          size="sm"
          onPress={handleOpenCreateModal}
          className="flex-row items-center gap-1 rounded-full px-3 h-8"
          accessibilityLabel="Add New Amenity Facility"
        >
          <Plus size={14} className="text-primary-foreground" />
          <Text className="text-primary-foreground font-bold text-xs">Add</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Master Amenity List */}
        <PaginatedList<AmenityFacility>
          data={filteredAmenities}
          renderItem={(item) => (
            <AmenityMasterCard
              key={item._id}
              item={item}
              onPress={(f) => setSelectedAmenityDetail(f)}
              onEdit={(f) => handleOpenEditModal(f)}
              onToggleStatus={(f) => handleToggleStatus(f)}
              onDelete={(f) => setDeleteTarget(f)}
            />
          )}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: filteredAmenities.length,
            limit: 50,
          }}
          onLoadMore={() => {}}
          onRefresh={loadData}
          loading={loading && facilities.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Building2"
          emptyTitle="No Amenity Records Found"
          emptySubtitle="No facility records match your active archetype filter or search query."
          contentContainerClassName="px-4 pt-3 pb-28"
        />

        {/* Primary Creation Action: Add Facility FAB */}
        <FAB
          iconName="Plus"
          label="Add Facility"
          onPress={handleOpenCreateModal}
        />
      </View>

      {/* 1. Initial Archetype Selection Bottom Sheet (Visitor Pattern UX) */}
      <AmenityArchetypeSheet
        visible={isArchetypeSheetOpen}
        selectedArchetype={creationArchetype}
        onClose={handleCloseArchetypeSheet}
        onSelectArchetype={handleSelectArchetypeForCreation}
      />

      {/* 2. Amenity Create / Edit Flow Wizard */}
      <AmenityCreationWizard
        visible={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit as any}
        amenity={editingAmenity}
        loading={saving}
        initialArchetype={creationArchetype}
      />

      {/* Facility Inspection Detail Sheet */}
      <AmenityDetailSheet
        visible={!!selectedAmenityDetail}
        onClose={() => setSelectedAmenityDetail(null)}
        amenity={selectedAmenityDetail}
        onEditClick={handleOpenEditModal}
        onScheduleMaintenanceClick={() => router.push('/(resident)/amenities/maintenance' as any)}
      />

      {/* Status Toggle Confirmation Modal */}
      <ConfirmationModal
        visible={!!deactivateTarget}
        title={
          deactivateTarget?.status === 'ACTIVE' || (deactivateTarget as any)?.isActive === true
            ? 'Deactivate Amenity Facility?'
            : 'Activate Amenity Facility?'
        }
        message={
          deactivateTarget?.status === 'ACTIVE' || (deactivateTarget as any)?.isActive === true
            ? `"${deactivateTarget?.name}" will be deactivated and marked unavailable for resident bookings. Are you sure you want to proceed?`
            : `Are you sure you want to activate "${deactivateTarget?.name}" and open it for resident bookings?`
        }
        variant={
          deactivateTarget?.status === 'ACTIVE' || (deactivateTarget as any)?.isActive === true
            ? 'warning'
            : 'info'
        }
        confirmLabel={
          deactivateTarget?.status === 'ACTIVE' || (deactivateTarget as any)?.isActive === true
            ? 'Deactivate Facility'
            : 'Activate Facility'
        }
        cancelLabel={
          deactivateTarget?.status === 'ACTIVE' || (deactivateTarget as any)?.isActive === true
            ? 'Keep Active'
            : 'Keep Inactive'
        }
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!deleteTarget}
        title="Delete Amenity Record?"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All associated settings and schedule configurations for this facility will be removed.`}
        variant="danger"
        confirmLabel="Delete Record"
        cancelLabel="Keep Amenity"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </ScreenShell>
  );
}
