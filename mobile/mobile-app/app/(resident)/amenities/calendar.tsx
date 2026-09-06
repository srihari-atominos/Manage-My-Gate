import React from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Plus } from 'lucide-react-native';
import { useResidentCalendar } from '../../../src/features/amenities/hooks/useResidentCalendar';
import { ScheduleDateNavigator } from '../../../src/features/amenities/components/ScheduleDateNavigator';
import { FacilityHeaderBanner } from '../../../src/features/amenities/components/FacilityHeaderBanner';
import { SlotAvailabilityGrid } from '../../../src/features/amenities/components/SlotAvailabilityGrid';

export default function ResidentAmenityCalendarScreen() {
  const {
    amenities,
    slots,
    slotsLoading,
    loading,
    error,
    selectedDate,
    selectedAmenityId,
    selectedSlot,
    amenityOptions,
    currentAmenity,
    setSelectedAmenityId,
    handleRefresh,
    navigateDate,
    setToday,
    handleDateChange,
    handleSlotSelect,
    handleBookAmenity,
  } = useResidentCalendar();

  const renderHeader = () => (
    <View className="gap-3.5 mb-2">
      {/* Date Stepper & Picker Navigation Bar */}
      <ScheduleDateNavigator
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onPrevDate={() => navigateDate(-1)}
        onNextDate={() => navigateDate(1)}
        onToday={setToday}
        title="Choose Availability Date"
      />

      {/* Facility Selector Card */}
      {amenityOptions.length > 0 && (
        <View className="bg-card p-3.5 rounded-2xl border border-border shadow-xs">
          <DropdownSelect
            label="Select Community Facility"
            options={amenityOptions}
            value={selectedAmenityId}
            onValueChange={setSelectedAmenityId}
          />
        </View>
      )}

      {/* Selected Facility Context Header */}
      {currentAmenity && (
        <FacilityHeaderBanner
          facilityName={currentAmenity.name}
          category={currentAmenity.category || currentAmenity.type}
          openTime={currentAmenity.openTime}
          closeTime={currentAmenity.closeTime}
          location={currentAmenity.location}
          bookingFee={currentAmenity.bookingFee}
          onBookPress={() => handleBookAmenity(currentAmenity._id)}
          bookButtonLabel="Book Slot"
        />
      )}
    </View>
  );

  return (
    <ScreenShell
      title="Facility Availability Calendar"
      subtitle="Check hourly slot availability across facilities"
      iconName="Calendar"
      loading={loading && amenities.length === 0}
      error={error}
      onRetry={handleRefresh}
      headerRight={
        currentAmenity ? (
          <Button
            variant="default"
            size="sm"
            onPress={() => handleBookAmenity(currentAmenity._id)}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Book Slot"
          >
            <Plus size={15} color="#ffffff" />
            <Text className="text-xs font-bold text-primary-foreground">Book Slot</Text>
          </Button>
        ) : null
      }
    >
      <View className="flex-1 bg-background">
        <PaginatedList
          data={[1]} // Structural single-element driver to leverage PaginatedList pull-to-refresh & virtualization
          renderItem={() => (
            <SlotAvailabilityGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSlotSelect={handleSlotSelect}
              onBookSlot={() => handleBookAmenity(selectedAmenityId)}
              loading={slotsLoading}
              emptyTitle="No Slots Available"
              emptySubtitle="No time slots generated for this date or facility."
              selectedDate={selectedDate}
            />
          )}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: slots.length,
            limit: 50,
          }}
          onLoadMore={() => {}}
          onRefresh={handleRefresh}
          loading={slotsLoading && slots.length === 0}
          ListHeaderComponent={renderHeader()}
          contentContainerClassName="p-4 gap-3.5 pb-28"
        />
      </View>
    </ScreenShell>
  );
}


