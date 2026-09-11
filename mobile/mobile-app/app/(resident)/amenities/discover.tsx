import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar, SortOption } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { CalendarCheck } from 'lucide-react-native';

import { useResidentAmenities } from '../../../src/features/amenities/hooks/useResidentAmenities';
import { ResidentAmenityDetailSheet } from '../../../src/features/amenities/components/ResidentAmenityDetailSheet';
import { AmenityCatalogCard } from '../../../src/features/amenities/components/AmenityCatalogCard';
import { AmenityFacility, AmenityArchetype } from '../../../src/features/amenities/types/amenityDomain.types';
import { useAuth } from '../../../src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser } from '../../../src/utils/rbac';

const ARCHETYPE_FILTER_OPTIONS: SortOption[] = [
  { label: 'All Facilities', value: 'All' },
  { label: 'Shared Capacity', value: 'SHARED_CAPACITY' },
  { label: 'Exclusive Hourly', value: 'EXCLUSIVE_HOURLY' },
  { label: 'Event Space', value: 'EVENT_SPACE' },
  { label: 'Room Resource', value: 'ROOM_RESOURCE' },
  { label: 'Inventory & Tools', value: 'INVENTORY_TOOLS' },
];

export default function DiscoverAmenitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Guard: Users without discover/resident amenity permissions are redirected
  if (user && !isFeatureAllowedForUser({ id: 'amenities_discover', permission: 'amenities:discover' }, user)) {
    if (isFeatureAllowedForUser({ id: 'amenities_scanner', permission: 'amenities:scanner' }, user)) {
      return <Redirect href="/(resident)/amenities/scanner" />;
    }
    if (isFeatureAllowedForUser({ id: 'amenities_dashboard', permission: 'amenities:dashboard' }, user)) {
      return <Redirect href="/(resident)/amenities/dashboard" />;
    }
    if (isFeatureAllowedForUser({ id: 'amenities_admin_calendar', permission: 'amenities:admin_calander' }, user)) {
      return <Redirect href="/(resident)/amenities/admin-calendar" />;
    }
    if (isFeatureAllowedForUser({ id: 'amenities_master', permission: 'amenities:amenities' }, user)) {
      return <Redirect href="/(resident)/amenities/admin-master" />;
    }
    return <Redirect href="/(resident)/dashboard" />;
  }

  const {
    facilities,
    selectedFacility,
    resources,
    selectedArchetype,
    searchQuery,
    pagination,
    loading,
    error,
    setSelectedArchetype,
    setSearchQuery,
    selectFacility,
    handleLoadMore,
    handleRefresh,
    clearError,
  } = useResidentAmenities();

  const [previewFacility, setPreviewFacility] = useState<AmenityFacility | null>(null);

  const stats = useMemo(() => {
    let activeCount = 0;
    let maintenanceCount = 0;

    facilities.forEach((f) => {
      if (f.status === 'ACTIVE') {
        activeCount++;
      } else if (f.status === 'MAINTENANCE') {
        maintenanceCount++;
      }
    });

    return {
      totalCount: pagination.totalRecords || facilities.length,
      activeCount,
      maintenanceCount,
    };
  }, [facilities, pagination.totalRecords]);

  const handleArchetypeChange = (value: string) => {
    if (value === 'All') {
      setSelectedArchetype(undefined);
    } else {
      setSelectedArchetype(value as AmenityArchetype);
    }
  };

  const handleCardPress = async (facility: AmenityFacility) => {
    setPreviewFacility(facility);
    try {
      await selectFacility(facility._id);
    } catch (e) {}
  };

  const navigateToBooking = (facilityId: string) => {
    setPreviewFacility(null);
    router.push({
      pathname: '/(resident)/amenities/booking/[id]' as any,
      params: { id: facilityId },
    });
  };

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Unified Search & Exact v2 Archetype Filter Bar */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search facilities, gym, courts, tools..."
        sortOptions={ARCHETYPE_FILTER_OPTIONS}
        currentSort={selectedArchetype || 'All'}
        onSortChange={handleArchetypeChange}
        className="px-0 py-0 border-0"
      />

      {/* Discovery Quick Stats Bar */}
      {!loading && stats.totalCount > 0 ? (
        <View className="flex-row items-center gap-2 bg-card p-2.5 rounded-2xl border border-border">
          <View className="bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30">
            <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {stats.totalCount} Facilities
            </Text>
          </View>
          <View className="bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {stats.activeCount} Available
            </Text>
          </View>
          {stats.maintenanceCount > 0 ? (
            <View className="bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {stats.maintenanceCount} Maintenance
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderAmenityItem = (item: AmenityFacility) => (
    <AmenityCatalogCard
      key={item._id}
      amenity={item}
      onPress={handleCardPress}
      onBookClick={navigateToBooking}
    />
  );

  return (
    <ScreenShell
      title="Discover Amenities"
      subtitle="Browse & reserve community facilities"
      iconName="Search"
      loading={loading && facilities.length === 0}
      error={error?.message || null}
      onRetry={() => {
        clearError();
        handleRefresh();
      }}
      headerRight={
        <Button
          variant="outline"
          size="sm"
          onPress={() => router.push('/(resident)/amenities/my-bookings' as any)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="View My Bookings"
        >
          <CalendarCheck size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">My Bookings</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Catalog Paginated List */}
        <PaginatedList
          data={facilities}
          renderItem={renderAmenityItem}
          pagination={pagination}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Building2"
          emptyTitle={searchQuery ? 'No Matching Amenities' : 'No Amenities Found'}
          emptySubtitle={
            searchQuery
              ? 'Try adjusting your search query or filter category.'
              : 'There are currently no community facilities registered in this estate.'
          }
          contentContainerClassName="px-4 pt-3 pb-28"
        />
      </View>

      {/* Resident Amenity Specification & Detail Sheet */}
      <ResidentAmenityDetailSheet
        visible={!!previewFacility}
        onClose={() => setPreviewFacility(null)}
        amenity={selectedFacility || previewFacility}
        resources={resources}
        onBookClick={navigateToBooking}
      />
    </ScreenShell>
  );
}
