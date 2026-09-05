import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { FAB } from '@/components/ui/FAB';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { SegmentedControl, SegmentItem } from '@/components/common/SegmentedControl';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { type StatusVariant } from '@/components/ui/StatusBadge';
import { Plus } from 'lucide-react-native';

import { useAdminCalendar } from '../../../src/features/amenities/hooks/useAdminCalendar';
import { ScheduleDateNavigator } from '../../../src/features/amenities/components/ScheduleDateNavigator';
import { ManualBookingModal } from '../../../src/features/amenities/components/ManualBookingModal';
import { AdminCancelReasonModal } from '../../../src/features/amenities/components/AdminCancelReasonModal';
import { BookingDetailModal } from '../../../src/features/amenities/components/BookingDetailModal';
import { AmenityBooking } from '../../../src/features/amenities/store/amenityBookingSlice';

export default function AdminAmenityCalendarScreen() {
  const router = useRouter();
  const {
    adminBookings,
    filteredBookings,
    amenities,
    viewMode,
    setViewMode,
    selectedDate,
    handleDateChange,
    navigateDate,
    setToday,
    selectedAmenityId,
    setSelectedAmenityId,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isManualModalOpen,
    cancelTarget,
    setCancelTarget,
    selectedBookingDetail,
    setSelectedBookingDetail,
    loading,
    error,
    submittingManual,
    submittingCancel,
    loadData,
    handleOpenManualModal,
    handleCloseManualModal,
    handleManualSubmit,
    handleConfirmAdminCancel,
  } = useAdminCalendar();

  // Segment Items for View Mode
  const viewSegments: SegmentItem[] = [
    { key: 'day', label: 'Day View' },
    { key: 'week', label: 'Week View' },
    { key: 'month', label: 'Month View' },
  ];

  // Facility Filter Options
  const amenityOptions = useMemo(() => {
    const opts = amenities.map((a) => ({ label: a.name, value: a._id }));
    return [{ label: 'All Facilities', value: 'All' }, ...opts];
  }, [amenities]);

  // Status Filter Options
  const statusOptions = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Checked In', value: 'CHECKED_IN' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const renderBookingItem = (item: AmenityBooking) => {
    if (!item) return null;

    const name =
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

    const isCancelled = (item.status as string) === 'CANCELLED' || (item.status as string) === 'REJECTED';
    const statusLabel = isCancelled ? 'CANCELLED' : item.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED';
    const statusVariant: StatusVariant = isCancelled ? 'danger' : item.status === 'COMPLETED' ? 'neutral' : 'success';

    const timeWindowStr = item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime || item.endTime || '';

    return (
      <ListCard
        key={item._id}
        title={timeWindowStr ? `${name} • ${timeWindowStr}` : name}
        subtitle={`Resident: ${residentName} (${villaNum})`}
        leftIcon="Calendar"
        status={{ label: statusLabel, variant: statusVariant }}
        timestamp={item.date || item.bookingDate}
        onPress={() => setSelectedBookingDetail(item)}
        className="mb-2.5"
      >
        <View className="flex-row items-center justify-between pt-2 border-t border-border/40 mt-1">
          <Text className="text-xs text-muted-foreground">
            Ref: #{item.bookingId || item._id.slice(-6).toUpperCase()}
          </Text>
          {!isCancelled && item.status !== 'COMPLETED' && (
            <Button
              variant="destructive"
              size="sm"
              onPress={() => setCancelTarget(item)}
              className="py-1 px-3 h-7"
              accessibilityLabel={`Cancel booking for ${residentName}`}
            >
              <Text className="text-destructive-foreground text-xs font-semibold">Cancel Slot</Text>
            </Button>
          )}
        </View>
      </ListCard>
    );
  };

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* View Mode Segmented Control */}
      <SegmentedControl
        segments={viewSegments}
        activeSegment={viewMode}
        onChange={(key: string) => setViewMode(key as any)}
      />

      {/* Date Navigation & Picker Bar */}
      <ScheduleDateNavigator
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onPrevDate={() => navigateDate(-1)}
        onNextDate={() => navigateDate(1)}
        onToday={setToday}
        title="Choose Occupancy Date"
      />

      {/* Search & Filter Controls Card */}
      <View className="bg-card p-3.5 rounded-2xl border border-border gap-3 shadow-xs">
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search resident, villa #, pass code..."
          variant="default"
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

      {/* Summary Counter */}
      <View className="flex-row items-center justify-between px-1">
        <Text variant="large" className="font-bold text-foreground">
          Reservations ({filteredBookings.length})
        </Text>
        {filteredBookings.length !== adminBookings.length && (
          <Text variant="muted" className="text-xs text-muted-foreground">
            Filtered from {adminBookings.length}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <ScreenShell
      title="Facility Schedule & Occupancy"
      subtitle="Track occupancy & block reserved slots"
      iconName="Calendar"
      loading={loading && adminBookings.length === 0}
      error={error}
      onRetry={loadData}
    >
      <View className="flex-1 bg-background">
        <PaginatedList<AmenityBooking>
          data={filteredBookings}
          renderItem={renderBookingItem}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: filteredBookings.length,
            limit: 50,
          }}
          onLoadMore={() => {}}
          onRefresh={loadData}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Calendar"
          emptyTitle="No Reservations Found"
          emptySubtitle="No active or pending bookings match your selected date bounds or filter."
          contentContainerClassName="p-4 pt-3 pb-28 gap-3"
        />

        {/* Primary Action: New Booking FAB */}
        <FAB
          iconName="Plus"
          label="New Booking"
          onPress={handleOpenManualModal}
        />
      </View>

      {/* Manual Admin Reservation Modal */}
      <ManualBookingModal
        visible={isManualModalOpen}
        onClose={handleCloseManualModal}
        onSubmit={handleManualSubmit}
        amenities={amenities}
        loading={submittingManual}
      />

      {/* Booking Details Inspection Modal */}
      <BookingDetailModal
        visible={!!selectedBookingDetail}
        onClose={() => setSelectedBookingDetail(null)}
        booking={selectedBookingDetail}
        onCancelClick={(b) => setCancelTarget(b)}
      />

      {/* Admin Cancel Reason Modal */}
      <AdminCancelReasonModal
        visible={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmAdminCancel}
        booking={cancelTarget}
        loading={submittingCancel}
      />
    </ScreenShell>
  );
}

