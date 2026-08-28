import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { DatePicker } from '@/components/common/DatePicker';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AppDispatch, RootState } from '../../../src/store/store';
import { fetchAmenitiesThunk, fetchAmenitySlotsThunk } from '../../../src/features/amenities/store/amenitySlice';

export default function ResidentAmenityCalendarScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>('');

  const { amenities, slots, slotsLoading, loading, error } = useSelector(
    (state: RootState) => state.amenities
  );

  useEffect(() => {
    dispatch(fetchAmenitiesThunk({}));
  }, [dispatch]);

  useEffect(() => {
    if (amenities.length > 0 && !selectedAmenityId) {
      setSelectedAmenityId(amenities[0]._id);
    }
  }, [amenities, selectedAmenityId]);

  useEffect(() => {
    if (selectedAmenityId && selectedDate) {
      dispatch(fetchAmenitySlotsThunk({ id: selectedAmenityId, date: selectedDate }));
    }
  }, [dispatch, selectedAmenityId, selectedDate]);

  const amenityOptions = amenities.map((a) => ({
    label: a.name,
    value: a._id,
  }));

  const currentAmenity = amenities.find((a) => a._id === selectedAmenityId);

  const handleRefresh = () => {
    dispatch(fetchAmenitiesThunk({}));
    if (selectedAmenityId && selectedDate) {
      dispatch(fetchAmenitySlotsThunk({ id: selectedAmenityId, date: selectedDate }));
    }
  };

  return (
    <ScreenShell
      title="Facility Availability Calendar"
      subtitle="Check hourly slot availability across facilities"
      iconName="Calendar"
      loading={loading && amenities.length === 0}
      error={error}
      onRetry={handleRefresh}
    >
      <ScrollView className="flex-1 px-4 pt-2" contentContainerClassName="pb-6">
        {/* Controls Card */}
        <View className="bg-card p-4 rounded-2xl border border-border mb-4 gap-3">
          <DatePicker
            label="Select Date"
            value={new Date(selectedDate)}
            onChange={(d) => setSelectedDate(d.toISOString().split('T')[0])}
          />

          {amenityOptions.length > 0 && (
            <DropdownSelect
              label="Select Facility"
              options={amenityOptions}
              value={selectedAmenityId}
              onValueChange={setSelectedAmenityId}
            />
          )}
        </View>

        {/* Facility Selected Header */}
        {currentAmenity && (
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 me-2">
              <Text variant="large" className="font-bold text-foreground">
                {currentAmenity.name} Slots
              </Text>
              <Text variant="muted" className="text-xs text-muted-foreground">
                Operating Hours: {currentAmenity.openTime} - {currentAmenity.closeTime}
              </Text>
            </View>
            <Button
              variant="default"
              onPress={() => router.push({ pathname: '/(resident)/amenities/booking/[id]', params: { id: currentAmenity._id } })}
              className="bg-primary px-3 py-2.5"
            >
              <Text className="text-white font-bold text-xs">Book Slot</Text>
            </Button>
          </View>
        )}

        {/* Slots List */}
        {slotsLoading ? (
          <View className="p-6 items-center">
            <Text variant="muted" className="text-xs">Loading available time slots...</Text>
          </View>
        ) : slots.length === 0 ? (
          <View className="bg-muted/20 p-6 rounded-2xl border border-border/40 items-center justify-center">
            <Text variant="muted" className="text-sm">No time slots generated for this date.</Text>
          </View>
        ) : (
          slots.map((slot, index) => {
            const isAvailable = slot.isAvailable !== false && slot.status !== 'BOOKED';
            return (
              <ListCard
                key={slot._id || index}
                title={`${slot.startTime} - ${slot.endTime}`}
                subtitle={`Available Capacity: ${slot.availableCount ?? (isAvailable ? 'Available' : 'Booked')}`}
                leftIcon="Clock"
                leftIconBgColor={isAvailable ? '#dcfce7' : '#fee2e2'}
                leftIconColor={isAvailable ? '#16a34a' : '#dc2626'}
                status={{
                  label: isAvailable ? 'AVAILABLE' : 'BOOKED',
                  variant: isAvailable ? 'success' : 'danger',
                }}
                onPress={
                  isAvailable && currentAmenity
                    ? () => router.push({ pathname: '/(resident)/amenities/booking/[id]', params: { id: currentAmenity._id } })
                    : undefined
                }
              />
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}
