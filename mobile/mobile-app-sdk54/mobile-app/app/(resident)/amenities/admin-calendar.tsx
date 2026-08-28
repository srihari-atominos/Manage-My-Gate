import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { DatePicker } from '@/components/common/DatePicker';
import { DatePickerModal, formatDateString } from '@/components/common/DatePickerModal';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { SegmentedControl, SegmentItem } from '@/components/common/SegmentedControl';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';

import { useAdminCalendar } from '../../../src/features/amenities/hooks/useAdminCalendar';
import { useAuth } from '../../../src/features/auth/hooks/useAuth';
import { ManualBookingModal } from '../../../src/features/amenities/components/ManualBookingModal';
import { AdminCancelReasonModal } from '../../../src/features/amenities/components/AdminCancelReasonModal';
import { BookingDetailModal } from '../../../src/features/amenities/components/BookingDetailModal';
import { AmenityBooking } from '../../../src/features/amenities/store/amenityBookingSlice';

export default function AdminAmenityCalendarScreen() {
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const {
    adminBookings,
    filteredBookings,
    amenities,
    viewMode,
    setViewMode,
    currentDate,
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

  const { user } = useAuth();

  const renderBookingItem = (item: AmenityBooking) => {
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
    const statusVariant = isCancelled ? 'danger' : item.status === 'COMPLETED' ? 'neutral' : 'success';

    return (
      <View key={item._id} className="mb-2">
        <ListCard
          title={name}
          subtitle={`${item.date || selectedDate} • ${item.startTime} - ${item.endTime} • ${residentName} (${villaNum})`}
          leftIcon="Clock"
          leftIconBgColor="#e0f2fe"
          leftIconColor="#0284c7"
          status={{
            label: statusLabel,
            variant: statusVariant,
          }}
          secondaryBadge={
            item.paymentMethod ? { label: item.paymentMethod, variant: 'neutral' } : { label: 'ONLINE', variant: 'neutral' }
          }
          onPress={() => setSelectedBookingDetail(item)}
        />
      </View>
    );
  };

  return (
    <ScreenShell
      title="Admin Occupancy Calendar"
      subtitle="Overview of community reservation schedules & slot bookings"
      iconName="CalendarDays"
      loading={loading && adminBookings.length === 0}
      error={error}
      onRetry={loadData}
    >
      <ScrollView className="flex-1 px-4 pt-2" contentContainerClassName="pb-8">
        {/* Header CTA & Title */}
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="large" className="font-bold text-foreground">
            Occupancy Overview
          </Text>
          <Button variant="default" onPress={handleOpenManualModal} className="bg-primary px-3 py-2.5">
            <Text className="text-white font-bold text-xs">+ Manual Reserve</Text>
          </Button>
        </View>

        {/* View Mode Segmented Switcher */}
        <View className="mb-3">
          <SegmentedControl
            segments={viewSegments}
            activeSegment={viewMode}
            onChange={(key) => setViewMode(key as any)}
          />
        </View>

        {/* Date Navigation Bar */}
        <View className="bg-card p-3 rounded-2xl border border-border mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Pressable
              onPress={() => navigateDate(-1)}
              className="p-2 rounded-lg bg-muted active:bg-muted/80"
              accessibilityRole="button"
              accessibilityLabel="Previous date period"
            >
              <Icon as={ChevronLeft} size={18} className="text-foreground" />
            </Pressable>

            <Pressable
              onPress={setToday}
              className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 active:bg-primary/20"
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
            >
              <Text className="text-xs font-bold text-primary">Today</Text>
            </Pressable>

            <Pressable
              onPress={() => navigateDate(1)}
              className="p-2 rounded-lg bg-muted active:bg-muted/80"
              accessibilityRole="button"
              accessibilityLabel="Next date period"
            >
              <Icon as={ChevronRight} size={18} className="text-foreground" />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setIsDatePickerModalOpen(true)}
            className="flex-row items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 active:bg-primary/20"
            accessibilityRole="button"
            accessibilityLabel="Open Calendar Date Picker"
          >
            <Icon as={CalendarIcon} size={16} className="text-primary" />
            <Text className="text-sm font-bold text-primary">
              {viewMode === 'day'
                ? selectedDate
                : viewMode === 'week'
                ? `Week of ${selectedDate}`
                : `${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`}
            </Text>
          </Pressable>
        </View>

        {/* Search & Filter Controls */}
        <View className="mb-4 gap-3">
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search resident, villa #, pass code..."
            variant="default"
            className="px-0 py-0"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <DropdownSelect
                label=""
                placeholder="All Facilities"
                options={amenityOptions}
                value={selectedAmenityId}
                onValueChange={setSelectedAmenityId}
              />
            </View>
            <View className="flex-1">
              <DropdownSelect
                label=""
                placeholder="All Statuses"
                options={statusOptions}
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
            </View>
          </View>
        </View>

        {/* Reservations Summary Counter */}
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="large" className="font-bold text-foreground">
            Reservations ({filteredBookings.length})
          </Text>
          {filteredBookings.length !== adminBookings.length && (
            <Text variant="muted" className="text-xs text-muted-foreground">
              Filtered from {adminBookings.length}
            </Text>
          )}
        </View>

        {/* Reservations List */}
        {filteredBookings.length === 0 ? (
          <View className="bg-muted/20 p-6 rounded-2xl border border-border/40 items-center justify-center">
            <Text variant="muted" className="text-sm text-center">
              {searchQuery || statusFilter !== 'All' || selectedAmenityId !== 'All'
                ? 'No reservations match your active search filters.'
                : `No reservations scheduled for ${selectedDate}.`}
            </Text>
          </View>
        ) : (
          filteredBookings.map(renderBookingItem)
        )}
      </ScrollView>

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

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={isDatePickerModalOpen}
        onClose={() => setIsDatePickerModalOpen(false)}
        selectedDate={new Date(`${selectedDate}T00:00:00`)}
        onSelectDate={(d) => handleDateChange(formatDateString(d))}
        title="Choose Occupancy Date"
      />
    </ScreenShell>
  );
}
