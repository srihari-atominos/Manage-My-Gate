import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { FAB } from '@/components/ui/FAB';
import { useMyBookings } from '@/src/features/amenities/hooks/useMyBookings';
import { AmenityBookingCard } from '@/src/features/amenities/components/AmenityBookingCard';
import { PassQRModal } from '@/src/features/amenities/components/PassQRModal';
import { CancelBookingModal } from '@/src/features/amenities/components/CancelBookingModal';
import { AmenityBooking } from '@/src/features/amenities/store/amenityBookingSlice';

export default function MyBookingsScreen() {
  const router = useRouter();
  const {
    myBookings,
    filteredBookings,
    loading,
    error,
    pagination,
    selectedFilter,
    filterTabs,
    selectedPassForQR,
    cancelTarget,
    isCancelling,
    setSelectedFilter,
    setSelectedPassForQR,
    setCancelTarget,
    handleRefresh,
    handleLoadMore,
    handleConfirmCancel,
  } = useMyBookings();

  const [search, setSearch] = React.useState('');

  const sortOptions = useMemo(
    () => [
      { label: 'All Bookings', value: 'All' },
      { label: 'Confirmed', value: 'CONFIRMED' },
      { label: 'Completed', value: 'COMPLETED' },
      { label: 'Cancelled', value: 'CANCELLED' },
    ],
    []
  );

  const displayedBookings = useMemo(() => {
    let list = filteredBookings;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((b) =>
        (b.amenityName && b.amenityName.toLowerCase().includes(q)) ||
        (b.passCode && b.passCode.toLowerCase().includes(q)) ||
        (b._id && b._id.toLowerCase().includes(q))
      );
    }
    return list;
  }, [filteredBookings, search]);

  const renderBookingItem = (item: AmenityBooking) => (
    <AmenityBookingCard
      key={item._id}
      booking={item}
      onPress={setSelectedPassForQR}
      onViewPassQR={setSelectedPassForQR}
      onCancelPress={setCancelTarget}
    />
  );

  const renderHeader = () => (
    <View className="gap-3 mb-3">
      {/* Real-Time Keyword Search Bar & Moveable Slide Status Filter */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by facility name or pass code..."
        sortOptions={sortOptions}
        currentSort={selectedFilter}
        onSortChange={setSelectedFilter}
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
      loading={loading && myBookings.length === 0}
      error={error}
      onRetry={handleRefresh}
    >
      <View className="flex-1 bg-background">
        {/* Paginated List of Bookings */}
        <PaginatedList
          data={displayedBookings}
          renderItem={renderBookingItem}
          pagination={pagination}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="CalendarX"
          emptyTitle="No Bookings Found"
          emptySubtitle="You have no reservations matching this filter."
          contentContainerClassName="px-4 pt-3 pb-28"
        />

        {/* Resident Action Trigger: FAB */}
        <FAB
          iconName="Plus"
          label="Book Amenity"
          onPress={() => router.push('/(resident)/amenities/discover' as any)}
        />
      </View>

      {/* Digital Pass QR Viewer Modal */}
      <PassQRModal
        visible={!!selectedPassForQR}
        onClose={() => setSelectedPassForQR(null)}
        booking={selectedPassForQR}
      />

      {/* Cancel Confirmation Modal */}
      <CancelBookingModal
        visible={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        booking={cancelTarget}
        loading={isCancelling}
      />
    </ScreenShell>
  );
}
