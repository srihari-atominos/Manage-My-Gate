import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPICard } from '@/components/ui/KPICard';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ListCard } from '@/components/ui/ListCard';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Text } from '@/components/ui/text';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';

import { useAdminLedgers } from '../../../src/features/amenities/hooks/useAdminLedgers';
import { BookingDetailModal } from '../../../src/features/amenities/components/BookingDetailModal';
import { AmenityBooking } from '../../../src/features/amenities/store/amenityBookingSlice';

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

  const renderHeader = () => (
    <View className="mb-4">
      {/* Financial Master KPI Summary */}
      <View className="flex-row gap-2.5 mb-4">
        <KPICard
          title="Total Revenue"
          value={`₹${kpis.totalMasterRevenue.toFixed(2)}`}
          iconName="DollarSign"
          iconColor="#10b981"
          className="flex-1"
        />
        <KPICard
          title="Today Earnings"
          value={`₹${kpis.todayEarnings.toFixed(2)}`}
          iconName="TrendingUp"
          iconColor="#f59e0b"
          className="flex-1"
        />
        <KPICard
          title="Total Entries"
          value={kpis.totalEntries}
          iconName="Receipt"
          iconColor="#3b82f6"
          className="flex-1"
        />
      </View>

      {/* Search & Filter Controls */}
      <View className="bg-card p-3.5 rounded-2xl border border-border mb-3 gap-3">
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search booking ID, resident, villa #..."
          variant="default"
          className="px-0 py-0"
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

      <Text variant="large" className="font-bold text-foreground mb-2">
        Master Financial Ledger Entries ({filteredBookings.length})
      </Text>
    </View>
  );

  const statusVariantMap: Record<string, StatusVariant> = {
    CONFIRMED: 'success',
    APPROVED: 'success',
    PENDING: 'warning',
    CHECKED_IN: 'info',
    COMPLETED: 'neutral',
    CANCELLED: 'danger',
  };

  const renderMasterItem = (item: AmenityBooking) => {
    const amenityName =
      typeof item.amenityId === 'object' && item.amenityId
        ? item.amenityId.name
        : item.amenityName || 'Amenity Slot';

    const residentName =
      item.residentName ||
      (typeof item.userId === 'object' && item.userId ? item.userId.name || item.userId.username : '') ||
      (item as any).userName ||
      'Community Resident';

    const villaNum =
      (item as any).villaNumber ||
      (item as any).flatNumber ||
      (typeof item.userId === 'object' && item.userId ? item.userId.villaNumber || item.userId.flatNumber : '') ||
      'Villa 101';

    const bookingCode = item.bookingId ? `#${item.bookingId}` : `#${item._id.slice(-6).toUpperCase()}`;

    const isCancelled = (item.status as string) === 'CANCELLED' || (item.status as string) === 'REJECTED';
    const statusLabel = isCancelled ? 'CANCELLED' : item.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED';
    const statusVariant = isCancelled ? 'danger' : item.status === 'COMPLETED' ? 'neutral' : 'success';

    return (
      <View key={item._id} className="mb-2">
        <ListCard
          title={`${bookingCode} • ${amenityName}`}
          subtitle={`Resident: ${residentName} (${villaNum}) • ${item.date}`}
          leftIcon="Receipt"
          leftIconBgColor="#f0fdf4"
          leftIconColor="#16a34a"
          status={{
            label: statusLabel,
            variant: statusVariant,
          }}
          rightContent={
            <View className="items-end">
              <Text className="font-bold text-sm text-foreground">
                {item.totalFee ? `₹${item.totalFee.toFixed(2)}` : 'Free'}
              </Text>
              <StatusBadge
                label={isCancelled ? 'REFUNDED' : 'PAID'}
                variant={isCancelled ? 'neutral' : 'success'}
                size="sm"
                className="mt-1"
              />
            </View>
          }
          onPress={() => setSelectedLedgerDetail(item)}
        />
      </View>
    );
  };

  return (
    <ScreenShell
      title="Master Ledgers & Accounts"
      subtitle="Financial accounts, master booking ledger & transaction audit trail"
      iconName="Receipt"
      loading={loading && adminBookings.length === 0}
      error={error}
      onRetry={handleRefresh}
    >
      <View className="flex-1 px-4 pt-2">
        <PaginatedList
          data={filteredBookings}
          renderItem={(item: AmenityBooking) => renderMasterItem(item)}
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
          contentContainerClassName="pb-6"
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
