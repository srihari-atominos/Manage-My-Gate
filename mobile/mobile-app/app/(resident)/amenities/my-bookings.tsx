import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Plus } from 'lucide-react-native';
import { useMyBookings } from '@/src/features/amenities/hooks/useMyBookings';
import { AmenityBookingCard } from '@/src/features/amenities/components/AmenityBookingCard';
import { PassQRModal } from '@/src/features/amenities/components/PassQRModal';
import { CancelBookingModal } from '@/src/features/amenities/components/CancelBookingModal';
import { AmenityBooking } from '@/src/features/amenities/store/amenityBookingSlice';
import { useTranslation } from '@/src/utils/i18n';

export default function MyBookingsScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
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
      { label: t('all_bookings', 'All Bookings'), value: 'All' },
      { label: t('confirmed', 'Confirmed'), value: 'CONFIRMED' },
      { label: t('completed', 'Completed'), value: 'COMPLETED' },
      { label: t('cancelled', 'Cancelled'), value: 'CANCELLED' },
    ],
    [t]
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
      key={`${item._id}-${language}`}
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
        searchPlaceholder={t('search_facility_pass', 'Search by facility name or pass code...')}
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
      title={t('my_amenity_bookings', 'My Amenity Bookings')}
      subtitle={t('my_amenity_bookings_sub', 'View, manage & access your digital reservation passes')}
      iconName="CalendarCheck"
      loading={loading && myBookings.length === 0}
      error={error}
      onRetry={handleRefresh}
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
          <Text className="text-xs font-bold text-primary-foreground">{t('book_amenity', 'Book Amenity')}</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Paginated List of Bookings */}
        <PaginatedList
          data={displayedBookings}
          renderItem={renderBookingItem}
          extraData={language}
          keyExtractor={(item) => `${item._id}-${language}`}
          pagination={pagination}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="CalendarX"
          emptyTitle={t('no_bookings_found', 'No Bookings Found')}
          emptySubtitle={t('no_bookings_matching_filter', 'You have no reservations matching this filter.')}
          contentContainerClassName="px-4 pt-3 pb-28"
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
