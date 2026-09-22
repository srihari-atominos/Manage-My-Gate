/**
 * My Bookings Screen - Phase 6C.2 Modernization
 * Resident Amenity Reservation Management List UI.
 * Consumes Phase 6C.1 useResidentReservations foundation and preserves the five orthogonal backend status dimensions.
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar, SortOption } from '@/components/ui/SearchFilterBar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  useResidentReservations,
  ReservationFilterTab,
} from '@/src/features/amenities/hooks/useResidentReservations';
import { ResidentReservationCard } from '@/src/features/amenities/components/ResidentReservationCard';
import { ResidentCancelModal } from '@/src/features/amenities/components/ResidentCancelModal';
import { AmenityReservation } from '@/src/features/amenities/types/amenityDomain.types';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';

export default function MyBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Guard: Users without resident booking permissions are redirected
  const hasBookingsAccess =
    isFeatureAllowedForUser({ id: 'amenities_my_booking', permission: 'amenities:my_booking' }, user) ||
    isFeatureAllowedForUser({ id: 'amenities_dashboard', permission: 'amenities:dashboard' }, user) ||
    isFeatureAllowedForUser({ id: 'amenities_master', permission: 'amenities:amenities' }, user);

  if (user && !hasBookingsAccess) {
    if (isFeatureAllowedForUser({ id: 'amenities_scanner', permission: 'amenities:scanner' }, user)) {
      return <Redirect href="/(resident)/amenities/scanner" />;
    }
    return <Redirect href="/(resident)/dashboard" />;
  }

  const {
    reservations,
    filteredReservations,
    loading,
    isRefreshing,
    isCancelling,
    error,
    pagination,
    selectedTab,
    setSelectedTab,
    searchQuery,
    setSearchQuery,
    cancelTarget,
    setCancelTarget,
    cancelReservation,
    refresh,
    loadMore,
  } = useResidentReservations();

  // Canonical presentation category tabs
  const sortOptions: SortOption[] = useMemo(
    () => [
      { label: 'All', value: 'All' },
      { label: 'Upcoming', value: 'Upcoming' },
      { label: 'Awaiting Approval', value: 'Awaiting Approval' },
      { label: 'Past', value: 'Past' },
      { label: 'Cancelled', value: 'Cancelled' },
    ],
    []
  );

  const handleCardPress = (reservation: AmenityReservation) => {
    router.push(`/(resident)/amenities/reservations/${reservation._id}` as any);
  };

  const handleConfirmCancel = async (reason?: string) => {
    if (!cancelTarget) return;
    try {
      await cancelReservation(cancelTarget._id, reason);
    } catch {
      // Error is caught and surfaced in state error
    }
  };

  const renderReservationItem = (item: AmenityReservation) => (
    <ResidentReservationCard
      key={item._id}
      reservation={item}
      onPress={handleCardPress}
      onCancelPress={setCancelTarget}
      testID={`reservation-card-${item._id}`}
    />
  );

  const renderHeader = () => (
    <View className="gap-3 mb-3">
      {/* Real-Time Keyword Search Bar & Moveable Slide Status Filter */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by facility name or reservation number..."
        sortOptions={sortOptions}
        currentSort={selectedTab}
        onSortChange={(value) => setSelectedTab(value as ReservationFilterTab)}
        variant="default"
        className="px-0 py-0 border-0"
      />
    </View>
  );

  return (
    <ScreenShell
      title="My Amenity Bookings"
      subtitle="View, manage & access your digital reservation passes"
      iconName="CalendarCheck"
      loading={loading && reservations.length === 0}
      error={error?.message || null}
      onRetry={refresh}
      headerRight={
        <Button
          variant="default"
          size="sm"
          onPress={() => router.push('/(resident)/amenities/discover' as any)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="Book Amenity"
        >
          <Plus size={15} color="#ffffff" />
          <Text className="text-xs font-bold text-primary-foreground">Book Amenity</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Paginated List of Reservations */}
        <PaginatedList
          data={filteredReservations}
          renderItem={renderReservationItem}
          pagination={pagination || { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 }}
          onLoadMore={loadMore}
          onRefresh={refresh}
          loading={loading}
          refreshing={isRefreshing}
          ListHeaderComponent={renderHeader()}
          emptyIcon="CalendarX"
          emptyTitle="No Bookings Found"
          emptySubtitle="You have no reservations matching this filter."
          contentContainerClassName="px-4 pt-3 pb-28"
        />
      </View>

      {/* Cancel Confirmation Modal */}
      <ResidentCancelModal
        visible={!!cancelTarget}
        reservation={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        loading={isCancelling}
        testID="resident-cancel-modal"
      />
    </ScreenShell>
  );
}
