import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIRow } from '@/components/ui/KPIRow';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

import { AmenityMasterCard } from '@/src/features/amenities/components/AmenityMasterCard';
import { useAmenityMaster } from '@/src/features/amenities/hooks/useAmenityMaster';
import { AmenityFormModal } from '@/src/features/amenities/components/AmenityFormModal';
import { AmenityDetailSheet } from '@/src/features/amenities/components/AmenityDetailSheet';
import { Amenity } from '@/src/features/amenities/store/amenitySlice';
import { Plus, Wrench } from 'lucide-react-native';

const CATEGORY_CHIPS = ['All', 'Sports', 'Fitness', 'Event Space', 'Clubhouse', 'Wellness', 'Workspace'];

export default function AdminAmenityMasterScreen() {
  const router = useRouter();
  const {
    amenities,
    filteredAmenities,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    loading,
    error,
    isFormModalOpen,
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
    handleOpenEditModal,
    handleCloseFormModal,
    handleFormSubmit,
    handleToggleStatus,
    handleConfirmDeactivate,
    handleConfirmDelete,
  } = useAmenityMaster();

  const kpis = useMemo(() => {
    const total = amenities.length;
    const active = amenities.filter((a) => (a.status || 'active').toLowerCase() === 'active').length;
    const maintenance = amenities.filter((a) => (a.status || '').toLowerCase() === 'maintenance').length;
    return { total, active, maintenance };
  }, [amenities]);

  const categorySortOptions = useMemo(() => {
    return CATEGORY_CHIPS.map((cat) => ({ label: cat, value: cat }));
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
            onPress: () => setSelectedCategory('All'),
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

      {/* Unified Search & Category Filter Bar */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search facility name or location..."
        sortOptions={categorySortOptions}
        currentSort={selectedCategory}
        onSortChange={setSelectedCategory}
        variant="default"
        className="px-0 py-0 border-0"
      />
    </View>
  );

  return (
    <ScreenShell
      title="Amenity Master Console"
      subtitle="Define community facilities, pricing & operating hours"
      iconName="Building2"
      loading={loading && amenities.length === 0}
      error={error}
      onRetry={loadData}
      headerRight={
        <View className="flex-row items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onPress={() => router.push('/(resident)/amenities/maintenance' as any)}
            className="flex-row items-center gap-1 rounded-full px-2.5 h-8 bg-amber-500/10 border-amber-500/30"
            accessibilityLabel="Maintenance Schedule"
          >
            <Wrench size={13} className="text-amber-600 dark:text-amber-400" />
            <Text className="text-amber-600 dark:text-amber-400 font-bold text-xs">Maintenance</Text>
          </Button>
          <Button
            size="sm"
            onPress={handleOpenCreateModal}
            className="flex-row items-center gap-1 rounded-full px-2.5 h-8 bg-emerald-600 active:bg-emerald-700"
            accessibilityLabel="Add New Amenity Facility"
          >
            <Plus size={14} color="#FFFFFF" />
            <Text className="text-white font-bold text-xs">Add</Text>
          </Button>
        </View>
      }
    >
      <View className="flex-1 bg-background">
        {/* Master Amenity List */}
        <PaginatedList<Amenity>
          data={filteredAmenities}
          renderItem={(item) => (
            <AmenityMasterCard
              key={item._id}
              item={item}
              onPress={(a) => setSelectedAmenityDetail(a)}
              onEdit={(a) => handleOpenEditModal(a)}
              onToggleStatus={(a) => handleToggleStatus(a)}
              onDelete={(a) => setDeleteTarget(a)}
            />
          )}
          pagination={{ currentPage: 1, totalPages: 1, totalRecords: filteredAmenities.length, limit: 50 }}
          onLoadMore={() => {}}
          onRefresh={loadData}
          loading={loading && amenities.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Building2"
          emptyTitle="No Amenity Records Found"
          emptySubtitle="No facility records match your active category filter or search query."
          contentContainerClassName="px-4 pt-3 pb-28"
        />
      </View>

      {/* Amenity Create / Edit Form Modal */}
      <AmenityFormModal
        visible={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit as any}
        amenity={editingAmenity}
        loading={saving}
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
        title={deactivateTarget?.status?.toLowerCase() === 'active' ? 'Deactivate Amenity Facility?' : 'Activate Amenity Facility?'}
        message={deactivateTarget?.status?.toLowerCase() === 'active' 
          ? `"${deactivateTarget?.name}" has active or upcoming resident bookings. Deactivating this facility will cancel all associated future bookings. Are you sure you want to proceed?`
          : `Are you sure you want to activate "${deactivateTarget?.name}" and open it for resident bookings?`
        }
        variant={deactivateTarget?.status?.toLowerCase() === 'active' ? 'warning' : 'info'}
        confirmLabel={deactivateTarget?.status?.toLowerCase() === 'active' ? 'Deactivate & Cancel Bookings' : 'Activate Facility'}
        cancelLabel={deactivateTarget?.status?.toLowerCase() === 'active' ? 'Keep Active' : 'Keep Inactive'}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!deleteTarget}
        title="Delete Amenity Record?"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All future reservation slots for this facility will be removed.`}
        variant="danger"
        confirmLabel="Delete Record"
        cancelLabel="Keep Amenity"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </ScreenShell>
  );
}
