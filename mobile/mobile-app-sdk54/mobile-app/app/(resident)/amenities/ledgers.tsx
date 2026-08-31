import React, { useMemo } from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIRow } from '@/components/ui/KPIRow';
import { KPICardProps } from '@/components/ui/KPICard';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Text } from '@/components/ui/text';
import { useAdminLedgers } from '@/src/features/amenities/hooks/useAdminLedgers';
import { BookingDetailModal } from '@/src/features/amenities/components/BookingDetailModal';
import { AmenityLedgerCard } from '@/src/features/amenities/components/AmenityLedgerCard';
import { AmenityBooking } from '@/src/features/amenities/store/amenityBookingSlice';

export default function AmenityLedgersScreen() {
  const {
    adminBookings,
    filteredBookings,
    amenities,
    pagination,
    currentPage,
    handlePageChange,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedAmenityId,
    setSelectedAmenityId,
    selectedLedgerDetail,
    setSelectedLedgerDetail,
    kpis,
    loading,
    error,
    handleRefresh,
  } = useAdminLedgers();

  const amenityOptions = useMemo(() => {
    const opts = amenities.map((a) => ({ label: a.name, value: a._id }));
    return [{ label: 'All Facilities', value: 'All' }, ...opts];
  }, [amenities]);

  const statusOptions = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Checked In', value: 'CHECKED_IN' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const kpiCards: KPICardProps[] = useMemo(
    () => [
      {
        title: 'Total Revenue',
        value: `₹${kpis.totalMasterRevenue.toFixed(2)}`,
        iconName: 'DollarSign',
        variant: 'success',
      },
      {
        title: 'Today Earnings',
        value: `₹${kpis.todayEarnings.toFixed(2)}`,
        iconName: 'TrendingUp',
        variant: 'warning',
      },
      {
        title: 'Total Entries',
        value: kpis.totalEntries,
        iconName: 'Receipt',
        variant: 'info',
      },
    ],
    [kpis.totalMasterRevenue, kpis.todayEarnings, kpis.totalEntries]
  );

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Financial Master KPI Summary */}
      <KPIRow cards={kpiCards} className="px-0" />

      {/* Search & Filter Controls */}
      <View className="bg-card p-3.5 rounded-2xl border border-border gap-3 shadow-xs">
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search booking ID, resident, villa #..."
          variant="bordered"
          className="px-0 py-0 border-0"
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <DropdownSelect
              label="Facility"
              options={amenityOptions}
              value={selectedAmenityId}
              onValueChange={setSelectedAmenityId}
            />
          </View>
          <View className="flex-1">
            <DropdownSelect
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
            />
          </View>
        </View>
      </View>

      <Text variant="large" className="font-bold text-foreground mt-1">
        Master Financial Ledger Entries ({filteredBookings.length})
      </Text>
    </View>
  );

  return (
    <ScreenShell
      title="Master Ledgers & Accounts"
      subtitle="Financial accounts, master booking ledger & transaction audit trail"
      iconName="Receipt"
      loading={loading && adminBookings.length === 0}
      error={error}
      onRetry={handleRefresh}
    >
      <View className="flex-1 bg-background">
        <PaginatedList<AmenityBooking>
          data={filteredBookings}
          renderItem={(item: AmenityBooking) => (
            <AmenityLedgerCard
              key={item._id}
              booking={item}
              onPress={() => setSelectedLedgerDetail(item)}
              className="mb-2"
            />
          )}
          pagination={pagination}
          onLoadMore={() => {
            if (currentPage < pagination.totalPages) {
              handlePageChange(currentPage + 1);
            }
          }}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Receipt"
          emptyTitle="No Master Ledger Entries"
          emptySubtitle="No financial ledger entries match your filter."
          contentContainerClassName="px-4 pt-2 pb-28"
        />
      </View>

      {/* Booking Details Inspection Modal */}
      <BookingDetailModal
        visible={!!selectedLedgerDetail}
        onClose={() => setSelectedLedgerDetail(null)}
        booking={selectedLedgerDetail}
      />
    </ScreenShell>
  );
}
