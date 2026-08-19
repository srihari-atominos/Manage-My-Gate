import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ListCard } from '@/components/ui/ListCard';
import { SearchBar } from '@/components/forms/SearchBar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

import { useAmenityMaster } from '../../../src/features/amenities/hooks/useAmenityMaster';
import { AmenityFormModal } from '../../../src/features/amenities/components/AmenityFormModal';
import { AmenityDetailSheet } from '../../../src/features/amenities/components/AmenityDetailSheet';
import { Amenity } from '../../../src/features/amenities/store/amenitySlice';

const CATEGORY_CHIPS = ['All', 'Event Space', 'Sports', 'Fitness', 'Wellness', 'Workspace', 'Clubhouse'];

export default function AdminAmenityMasterScreen() {
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

  const renderHeader = () => (
    <View className="mb-3">
      {/* Header Action Row & Search */}
      <View className="flex-row items-center justify-between mb-3 gap-2">
        <View className="flex-1">
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search amenity master..."
          />
        </View>
        <Button variant="default" onPress={handleOpenCreateModal} className="bg-primary px-3.5 py-3">
          <Text className="text-white font-bold text-xs">+ Add Amenity</Text>
        </Button>
      </View>

      {/* Category Filter Chips Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-1">
        {CATEGORY_CHIPS.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full border text-xs me-1.5 ${
                isActive
                  ? 'bg-primary border-primary'
                  : 'bg-muted/40 border-border active:bg-muted'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderAmenityItem = (item: Amenity) => {
    const itemStatus = (item.status || '').toLowerCase();
    const isMaintenance = itemStatus === 'maintenance';
    const isInactive = itemStatus === 'inactive';
    const isActive = itemStatus === 'active';
    const pricingType = item.pricing?.pricingType || 'hourly';
    const baseRate = item.pricing?.baseRate ?? item.bookingFee ?? 0;
    const openTime = item.bookingRules?.openTime || item.openTime || '08:00';
    const closeTime = item.bookingRules?.closeTime || item.closeTime || '21:00';
    const category = item.category || item.type || 'General';
    const imageUrl = item.imageUrl || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '');

    return (
      <View key={item._id} className="mb-2">
        <Pressable onPress={() => setSelectedAmenityDetail(item)}>
          {imageUrl ? (
            <View className="bg-card rounded-2xl border border-border overflow-hidden mb-1 p-3">
              <View className="h-32 w-full rounded-xl overflow-hidden mb-2.5">
                <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="font-bold text-base text-foreground">{item.name}</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {category} • {item.location || 'Zone'} • Cap: {item.capacity || 20} • {openTime}-{closeTime}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-xs font-bold text-primary">
                    {baseRate ? `$${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}` : 'Free'}
                  </Text>
                  <Text
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isMaintenance
                        ? 'bg-amber-500/10 text-amber-600'
                        : isInactive
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    {isMaintenance ? 'Maintenance' : isInactive ? 'Inactive' : 'Active'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <ListCard
              title={item.name}
              subtitle={`${category} • ${item.location || 'Zone'} • Cap: ${item.capacity || 20} • ${openTime}-${closeTime}`}
              leftIcon="Building2"
              leftIconBgColor="#ccfbf1"
              leftIconColor="#0d9488"
              status={{
                label: isMaintenance ? 'Maintenance' : isInactive ? 'Inactive' : 'Active',
                variant: isMaintenance ? 'warning' : isInactive ? 'neutral' : 'success',
              }}
              secondaryBadge={
                baseRate
                  ? { label: `$${baseRate}/${pricingType === 'daily' ? 'day' : 'slot'}`, variant: 'info' }
                  : { label: 'Free', variant: 'neutral' }
              }
            />
          )}
        </Pressable>
        <View className="flex-row justify-end gap-2 px-1 -mt-0.5 mb-2">
          <Button
            variant="outline"
            onPress={() => handleOpenEditModal(item)}
            className="py-1 px-3 border-primary/30 bg-primary/10"
          >
            <Text className="text-primary text-xs font-bold">Edit</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => handleToggleStatus(item)}
            className="py-1 px-3 bg-muted/40"
          >
            <Text className="text-foreground text-xs font-semibold">
              {isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => setDeleteTarget(item)}
            className="py-1 px-3 border-red-500/30 bg-red-500/10"
          >
            <Text className="text-red-600 dark:text-red-400 text-xs font-semibold">Delete</Text>
          </Button>
        </View>
      </View>
    );
  };

  return (
    <ScreenShell
      title="Amenity Master Console"
      subtitle="Define community facilities, pricing & operating hours"
      iconName="Building2"
      loading={loading && amenities.length === 0}
      error={error}
      onRetry={loadData}
    >
      <View className="flex-1 px-4 pt-2">
        {/* Master Amenity List */}
        <PaginatedList
          data={filteredAmenities}
          renderItem={renderAmenityItem}
          pagination={{ currentPage: 1, totalPages: 1, totalRecords: filteredAmenities.length, limit: 20 }}
          onLoadMore={() => {}}
          onRefresh={loadData}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Building2"
          emptyTitle="No Amenity Records"
          emptySubtitle="No master amenity records match your active category filter."
          contentContainerClassName="pb-6"
        />
      </View>

      {/* Amenity Create / Edit Form Modal */}
      <AmenityFormModal
        visible={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        amenity={editingAmenity}
        loading={saving}
      />

      {/* Facility Inspection Detail Sheet */}
      <AmenityDetailSheet
        visible={!!selectedAmenityDetail}
        onClose={() => setSelectedAmenityDetail(null)}
        amenity={selectedAmenityDetail}
        onEditClick={handleOpenEditModal}
      />

      {/* Deactivate Confirmation Modal */}
      <ConfirmationModal
        visible={!!deactivateTarget}
        title="Deactivate Amenity Facility?"
        message={`"${deactivateTarget?.name}" has active or upcoming resident bookings. Deactivating this facility will cancel all associated future bookings. Are you sure you want to proceed?`}
        variant="warning"
        confirmLabel="Deactivate & Cancel Bookings"
        cancelLabel="Keep Active"
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
