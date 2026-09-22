import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/common/Chip';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { formatDateString } from '@/components/common/DatePickerModal';

export interface CalendarFilterState {
  datePreset: 'selected' | 'today' | 'week' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  facilityId: string;
  availability: string;
  timePreset: 'all' | 'morning' | 'afternoon' | 'evening' | 'custom';
  customStartTime?: string;
  customEndTime?: string;
  bookingStatus: string;
  paymentStatus: string;
}

export interface AdminCalendarFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: CalendarFilterState;
  onApply: (newFilters: CalendarFilterState) => void;
  onReset: () => void;
  amenities: Array<{ _id: string; name: string }>;
}

const AVAILABILITY_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Partially Available', value: 'PARTIALLY_AVAILABLE' },
  { label: 'Fully Booked', value: 'FULLY_BOOKED' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Blocked', value: 'BLOCKED' },
];

const TIME_PRESET_OPTIONS: Array<{ label: string; value: CalendarFilterState['timePreset'] }> = [
  { label: 'Any Time', value: 'all' },
  { label: 'Morning (6AM-12PM)', value: 'morning' },
  { label: 'Afternoon (12PM-5PM)', value: 'afternoon' },
  { label: 'Evening (5PM-10PM)', value: 'evening' },
  { label: 'Custom', value: 'custom' },
];

const STATUS_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Checked In', value: 'CHECKED_IN' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const PAYMENT_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Not Required', value: 'NOT_REQUIRED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

const DATE_PRESET_OPTIONS: Array<{ label: string; value: CalendarFilterState['datePreset'] }> = [
  { label: 'Selected Date', value: 'selected' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom Range', value: 'custom' },
];

export function AdminCalendarFilterDrawer({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  amenities,
}: AdminCalendarFilterDrawerProps) {
  const [draft, setDraft] = useState<CalendarFilterState>(filters);

  // Sync draft whenever drawer opens
  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [visible, filters]);

  // Facility Options
  const facilityOptions = useMemo(
    () => [
      { label: 'All Facilities', value: 'All' },
      ...amenities.map((a) => ({ label: a.name, value: a._id })),
    ],
    [amenities]
  );

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filter Reservations & Schedule">
      <View className="gap-5 pb-6">
        {/* 1. FACILITY SELECTION (Interactive Wrapped Chips) */}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Facility
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {facilityOptions.map((opt) => {
              const isSelected = draft.facilityId === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => setDraft((p) => ({ ...p, facilityId: opt.value }))}
                />
              );
            })}
          </View>
        </View>

        {/* 2. DATE PRESETS & RANGE */}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Date Range
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DATE_PRESET_OPTIONS.map((opt) => {
              const isSelected = draft.datePreset === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => setDraft((p) => ({ ...p, datePreset: opt.value }))}
                />
              );
            })}
          </View>

          {draft.datePreset === 'custom' && (
            <View className="gap-2 mt-1">
              <View className="flex-row gap-2">
                <Chip
                  label="Next 7 Days"
                  onPress={() => {
                    const now = new Date();
                    const next7 = new Date();
                    next7.setDate(now.getDate() + 7);
                    setDraft((p) => ({
                      ...p,
                      customStartDate: formatDateString(now),
                      customEndDate: formatDateString(next7),
                    }));
                  }}
                />
                <Chip
                  label="Next 14 Days"
                  onPress={() => {
                    const now = new Date();
                    const next14 = new Date();
                    next14.setDate(now.getDate() + 14);
                    setDraft((p) => ({
                      ...p,
                      customStartDate: formatDateString(now),
                      customEndDate: formatDateString(next14),
                    }));
                  }}
                />
                <Chip
                  label="Next 30 Days"
                  onPress={() => {
                    const now = new Date();
                    const next30 = new Date();
                    next30.setDate(now.getDate() + 30);
                    setDraft((p) => ({
                      ...p,
                      customStartDate: formatDateString(now),
                      customEndDate: formatDateString(next30),
                    }));
                  }}
                />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TextInput
                    label="From (YYYY-MM-DD)"
                    placeholder="2026-09-01"
                    value={draft.customStartDate || ''}
                    onChangeText={(val) => setDraft((p) => ({ ...p, customStartDate: val }))}
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    label="To (YYYY-MM-DD)"
                    placeholder="2026-09-30"
                    value={draft.customEndDate || ''}
                    onChangeText={(val) => setDraft((p) => ({ ...p, customEndDate: val }))}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 3. AVAILABILITY STATE */}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Availability State
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((opt) => {
              const isSelected = draft.availability === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => setDraft((p) => ({ ...p, availability: opt.value }))}
                />
              );
            })}
          </View>
        </View>

        {/* 4. TIME PRESETS & CUSTOM TIME */}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Time Slot
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {TIME_PRESET_OPTIONS.map((opt) => {
              const isSelected = draft.timePreset === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => setDraft((p) => ({ ...p, timePreset: opt.value }))}
                />
              );
            })}
          </View>

          {draft.timePreset === 'custom' && (
            <View className="flex-row gap-2 mt-1">
              <View className="flex-1">
                <TextInput
                  label="From (HH:mm)"
                  placeholder="09:00"
                  value={draft.customStartTime || ''}
                  onChangeText={(val) => setDraft((p) => ({ ...p, customStartTime: val }))}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  label="To (HH:mm)"
                  placeholder="17:00"
                  value={draft.customEndTime || ''}
                  onChangeText={(val) => setDraft((p) => ({ ...p, customEndTime: val }))}
                />
              </View>
            </View>
          )}
        </View>

        {/* 5. BOOKING STATUS */}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Booking Status
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = draft.bookingStatus === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => setDraft((p) => ({ ...p, bookingStatus: opt.value }))}
                />
              );
            })}
          </View>
        </View>

        {/* 6. PAYMENT STATUS */}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Payment Status
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PAYMENT_OPTIONS.map((opt) => {
              const isSelected = draft.paymentStatus === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => setDraft((p) => ({ ...p, paymentStatus: opt.value }))}
                />
              );
            })}
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View className="flex-row gap-3 pt-3 border-t border-border/60 mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onPress={handleReset}
            accessibilityLabel="Reset Filters"
          >
            Reset
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onPress={handleApply}
            accessibilityLabel="Apply Filters"
          >
            Apply Filters
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default AdminCalendarFilterDrawer;
