import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { FAB } from '@/components/ui/FAB';
import { Text } from '@/components/ui/text';

import { useResidentDiscover } from '../../../src/features/amenities/hooks/useResidentDiscover';
import { ResidentAmenityDetailSheet } from '../../../src/features/amenities/components/ResidentAmenityDetailSheet';
import { AmenityCatalogCard } from '../../../src/features/amenities/components/AmenityCatalogCard';
import { Amenity } from '../../../src/features/amenities/store/amenitySlice';

export default function DiscoverAmenitiesScreen() {
  const router = useRouter();
  const {
    amenities,
    categories,
    selectedCategory,
    searchQuery,
    pagination,
    stats,
    selectedAmenityPreview,
    setSelectedAmenityPreview,
    loading,
    error,
    handleCategorySelect,
    handleSearchChange,
    handleRefresh,
    handleLoadMore,
    handleRetry,
    navigateToBooking,
  } = useResidentDiscover();

  const categorySortOptions = React.useMemo(() => {
    return categories.map((cat) => ({ label: cat, value: cat }));
  }, [categories]);

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Unified Search & Category Filter Bar */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search amenities, clubhouse, pool..."
        sortOptions={categorySortOptions}
        currentSort={selectedCategory}
        onSortChange={handleCategorySelect}
        className="px-0 py-0 border-0"
      />

      {/* Discovery Quick Stats Bar */}
      {!loading && stats.totalCount > 0 ? (
        <View className="flex-row items-center gap-2 bg-card p-2.5 rounded-2xl border border-border">
          <View className="bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            <Text className="text-xs font-bold text-primary">{stats.totalCount} Facilities</Text>
          </View>
          <View className="bg-status-success/15 px-2.5 py-1 rounded-full border border-status-success/30">
            <Text className="text-xs font-bold text-status-success">
              {stats.activeCount} Available
            </Text>
          </View>
          {stats.maintenanceCount > 0 ? (
            <View className="bg-status-warning/15 px-2.5 py-1 rounded-full border border-status-warning/30">
              <Text className="text-xs font-bold text-status-warning">
                {stats.maintenanceCount} Maintenance
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderAmenityItem = (item: Amenity) => (
    <AmenityCatalogCard
      key={item._id}
      amenity={item}
      onPress={setSelectedAmenityPreview}
      onBookClick={navigateToBooking}
    />
  );

  return (
    <ScreenShell
      title="Discover Amenities"
      subtitle="Browse & reserve community facilities"
      iconName="Search"
      loading={false}
      error={error}
      onRetry={handleRetry}
    >
      <View className="flex-1 bg-background">
        {/* Catalog Paginated List */}
        <PaginatedList
          data={amenities}
          renderItem={renderAmenityItem}
          pagination={pagination}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Building2"
          emptyTitle="No Amenities Found"
          emptySubtitle="Try adjusting your search query or category filter."
          contentContainerClassName="px-4 pt-3 pb-28"
        />

        {/* Resident View Navigation FAB */}
        <FAB
          iconName="CalendarCheck"
          label="My Bookings"
          onPress={() => router.push('/(resident)/amenities/my-bookings' as any)}
        />
      </View>

      {/* Resident Amenity Specification & Booking Preview Sheet */}
      <ResidentAmenityDetailSheet
        visible={!!selectedAmenityPreview}
        onClose={() => setSelectedAmenityPreview(null)}
        amenity={selectedAmenityPreview}
        onBookClick={navigateToBooking}
      />
    </ScreenShell>
  );
}
