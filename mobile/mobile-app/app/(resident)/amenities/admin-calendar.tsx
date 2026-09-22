import React, { useState, useMemo } from 'react';
import { View, TextInput as RNTextInput, Pressable } from 'react-native';
import { Redirect } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Search, SlidersHorizontal, X, Calendar as CalendarIcon } from 'lucide-react-native';

import { useAdminCalendar } from '../../../src/features/amenities/hooks/useAdminCalendar';
import { AdminCalendarView } from '../../../src/features/amenities/components/AdminCalendarView';
import { AdminReservationCard } from '../../../src/features/amenities/components/AdminReservationCard';
import { AdminCalendarFilterDrawer } from '../../../src/features/amenities/components/AdminCalendarFilterDrawer';
import { AdminActiveFilterChips } from '../../../src/features/amenities/components/AdminActiveFilterChips';
import { AdminAvailabilitySummary } from '../../../src/features/amenities/components/AdminAvailabilitySummary';
import { BookingDetailModal } from '../../../src/features/amenities/components/BookingDetailModal';
import { AmenityBooking } from '../../../src/features/amenities/store/amenityBookingSlice';
import { useAuth } from '../../../src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser } from '../../../src/utils/rbac';

export default function AdminAmenityCalendarScreen() {
  const { user } = useAuth();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Guard: Non-admin users or users without amenity permissions are redirected
  if (user && !isFeatureAllowedForUser({ id: 'amenities_admin_calendar', permission: 'amenities:admin_calander' }, user)) {
    if (isFeatureAllowedForUser({ id: 'amenities_discover', permission: 'amenities:discover' }, user)) {
      return <Redirect href="/(resident)/amenities/discover" />;
    }
    if (isFeatureAllowedForUser({ id: 'amenities_scanner', permission: 'amenities:scanner' }, user)) {
      return <Redirect href="/(resident)/amenities/scanner" />;
    }
    return <Redirect href="/(resident)/dashboard" />;
  }

  const {
    adminBookings,
    filteredBookings,
    selectedDateBookings,
    bookingCountsByDate,
    amenities,
    availableResources,
    conflictedBookingIds,
    availabilitySummary,
    currentDate,
    selectedDate,
    handleDateChange,
    navigateDate,
    filters,
    searchQuery,
    setSearchQuery,
    handleApplyFilters,
    handleResetFilters,
    handleRemoveFilter,
    activeFilterCount,
    selectedBookingDetail,
    setSelectedBookingDetail,
    pagination,
    handleLoadMore,
    loading,
    error,
    loadData,
  } = useAdminCalendar();

  // Formatted selected date header
  const formattedSelectedDateHeader = useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    const d =
      parts.length === 3
        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
        : new Date(selectedDate);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const selectedDateReservationCount = bookingCountsByDate[selectedDate] || 0;

  const renderBookingItem = (item: AmenityBooking) => {
    if (!item) return null;
    return (
      <AdminReservationCard
        key={item._id || item.bookingId}
        booking={item}
        isConflicted={conflictedBookingIds.has(item._id)}
        onPress={(b) => setSelectedBookingDetail(b)}
      />
    );
  };

  const renderHeader = () => (
    <View className="mb-2.5 gap-2.5">
      {/* Search & Filter Bar */}
      <View className="flex-row items-center gap-2">
        {/* Search Input */}
        <View className="flex-1 flex-row items-center bg-card border border-border/80 rounded-xl px-3 h-10 shadow-2xs">
          <Icon as={Search} size={16} className="text-muted-foreground mr-2" />
          <RNTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search resident, villa #, ref ID..."
            placeholderTextColor="#9ca3af"
            className="flex-1 text-xs text-foreground font-normal py-0"
            accessibilityLabel="Search resident, villa number, or reservation ID"
          />
          {Boolean(searchQuery) && (
            <Pressable
              onPress={() => setSearchQuery('')}
              className="p-1"
              accessibilityLabel="Clear search"
            >
              <Icon as={X} size={14} className="text-muted-foreground" />
            </Pressable>
          )}
        </View>

        {/* Filter Trigger Button */}
        <Pressable
          onPress={() => setIsFilterDrawerOpen(true)}
          className={`flex-row items-center justify-center gap-1.5 px-3 h-10 rounded-xl border ${
            activeFilterCount > 0
              ? 'bg-primary/10 border-primary/40'
              : 'bg-card border-border/80 shadow-2xs active:bg-muted'
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Open filters. ${activeFilterCount} active filters.`}
        >
          <Icon
            as={SlidersHorizontal}
            size={15}
            className={activeFilterCount > 0 ? 'text-primary' : 'text-foreground'}
          />
          <Text
            className={`text-xs font-bold ${
              activeFilterCount > 0 ? 'text-primary' : 'text-foreground'
            }`}
          >
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View className="w-4 h-4 rounded-full bg-primary items-center justify-center ms-0.5">
              <Text className="text-[10px] font-bold text-primary-foreground leading-none">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Active Filter Chips Row */}
      <AdminActiveFilterChips
        filters={filters}
        searchQuery={searchQuery}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleResetFilters}
        amenities={amenities}
      />

      {/* Compact Month Calendar */}
      <AdminCalendarView
        currentDate={currentDate}
        selectedDate={selectedDate}
        onSelectDate={handleDateChange}
        bookingCountsByDate={bookingCountsByDate}
        onPrevDate={() => navigateDate(-1)}
        onNextDate={() => navigateDate(1)}
      />

      {/* Compact Availability Summary for Selected Date */}
      <AdminAvailabilitySummary items={availabilitySummary} />

      {/* Selected Date Header & Total Reservation Count */}
      <View className="flex-row items-center justify-between px-1 pt-1">
        <View>
          <Text className="text-xs font-semibold text-muted-foreground">
            {formattedSelectedDateHeader}
          </Text>
          <Text variant="large" className="font-bold text-foreground text-base mt-0.5">
            Reservations ({selectedDateReservationCount})
          </Text>
        </View>
        {filteredBookings.length > 0 && (
          <Text variant="muted" className="text-xs text-muted-foreground">
            {filteredBookings.length} total in range
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmptyComponent = () => {
    if (activeFilterCount > 0) {
      return (
        <View className="items-center justify-center p-6 bg-card rounded-2xl border border-border mt-1">
          <Icon as={CalendarIcon} size={32} className="text-muted-foreground mb-2" />
          <Text className="text-sm font-bold text-foreground text-center">
            No reservations match the selected filters
          </Text>
          <Text className="text-xs text-muted-foreground text-center mt-1 mb-3">
            Try adjusting your filter settings or selecting another date.
          </Text>
          <Button variant="outline" size="sm" onPress={handleResetFilters}>
            Clear Filters
          </Button>
        </View>
      );
    }

    return (
      <View className="items-center justify-center p-6 bg-card rounded-2xl border border-border mt-1">
        <Icon as={CalendarIcon} size={32} className="text-muted-foreground mb-2" />
        <Text className="text-sm font-bold text-foreground text-center">
          No reservations for this date
        </Text>
        <Text className="text-xs text-muted-foreground text-center mt-1">
          There are no bookings or maintenance events scheduled for this day.
        </Text>
      </View>
    );
  };

  return (
    <ScreenShell
      title="Facility Schedule & Occupancy"
      subtitle="Track occupancy & monitor reservations"
      iconName="Calendar"
      loading={loading && adminBookings.length === 0}
      error={error}
    >
      <View className="flex-1 bg-background">
        <PaginatedList<AmenityBooking>
          data={selectedDateBookings}
          renderItem={renderBookingItem}
          pagination={
            pagination || {
              currentPage: 1,
              totalPages: 1,
              totalRecords: selectedDateBookings.length,
              limit: 50,
            }
          }
          onLoadMore={handleLoadMore}
          onRefresh={loadData}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={renderEmptyComponent()}
          contentContainerClassName="p-3 pt-2.5 pb-28 gap-2.5"
        />
      </View>

      {/* Filter Bottom Sheet */}
      <AdminCalendarFilterDrawer
        visible={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        amenities={amenities}
      />

      {/* Booking Details Inspection Modal */}
      <BookingDetailModal
        visible={!!selectedBookingDetail}
        onClose={() => setSelectedBookingDetail(null)}
        booking={selectedBookingDetail}
      />
    </ScreenShell>
  );
}
