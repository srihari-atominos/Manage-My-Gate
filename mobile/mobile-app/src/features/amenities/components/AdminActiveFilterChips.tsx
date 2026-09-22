import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Chip } from '@/components/common/Chip';
import { Text } from '@/components/ui/text';
import { CalendarFilterState } from './AdminCalendarFilterDrawer';

export interface AdminActiveFilterChipsProps {
  filters: CalendarFilterState;
  searchQuery?: string;
  onRemoveFilter: (key: keyof CalendarFilterState | 'searchQuery') => void;
  onClearAll: () => void;
  amenities: Array<{ _id: string; name: string }>;
}

export function AdminActiveFilterChips({
  filters,
  searchQuery,
  onRemoveFilter,
  onClearAll,
  amenities,
}: AdminActiveFilterChipsProps) {
  const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

  // Search
  if (searchQuery && searchQuery.trim()) {
    chips.push({
      id: 'search',
      label: `Search: "${searchQuery}"`,
      onRemove: () => onRemoveFilter('searchQuery'),
    });
  }

  // Date Preset
  if (filters.datePreset && filters.datePreset !== 'selected') {
    const labelMap: Record<string, string> = {
      today: 'Date: Today',
      week: 'Date: This Week',
      month: 'Date: This Month',
      custom: `Date: ${filters.customStartDate || 'Start'} to ${filters.customEndDate || 'End'}`,
    };
    chips.push({
      id: 'date',
      label: labelMap[filters.datePreset] || 'Date',
      onRemove: () => onRemoveFilter('datePreset'),
    });
  }

  // Facility
  if (filters.facilityId && filters.facilityId !== 'All') {
    const facility = amenities.find((a) => a._id === filters.facilityId);
    chips.push({
      id: 'facility',
      label: `Facility: ${facility ? facility.name : filters.facilityId}`,
      onRemove: () => onRemoveFilter('facilityId'),
    });
  }

  // Availability
  if (filters.availability && filters.availability !== 'ALL') {
    const availLabelMap: Record<string, string> = {
      AVAILABLE: 'Available',
      PARTIALLY_AVAILABLE: 'Partially Avail',
      FULLY_BOOKED: 'Fully Booked',
      MAINTENANCE: 'Maintenance',
      BLOCKED: 'Blocked',
    };
    chips.push({
      id: 'availability',
      label: `Avail: ${availLabelMap[filters.availability] || filters.availability}`,
      onRemove: () => onRemoveFilter('availability'),
    });
  }

  // Time
  if (filters.timePreset && filters.timePreset !== 'all') {
    const timeLabelMap: Record<string, string> = {
      morning: 'Time: Morning',
      afternoon: 'Time: Afternoon',
      evening: 'Time: Evening',
      custom: `Time: ${filters.customStartTime || '00:00'}-${filters.customEndTime || '23:59'}`,
    };
    chips.push({
      id: 'time',
      label: timeLabelMap[filters.timePreset] || 'Time',
      onRemove: () => onRemoveFilter('timePreset'),
    });
  }

  // Status
  if (filters.bookingStatus && filters.bookingStatus !== 'All') {
    chips.push({
      id: 'status',
      label: `Status: ${filters.bookingStatus}`,
      onRemove: () => onRemoveFilter('bookingStatus'),
    });
  }

  // Payment
  if (filters.paymentStatus && filters.paymentStatus !== 'All') {
    chips.push({
      id: 'payment',
      label: `Payment: ${filters.paymentStatus}`,
      onRemove: () => onRemoveFilter('paymentStatus'),
    });
  }

  if (chips.length === 0) return null;

  return (
    <View className="py-1">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
        {chips.map((chip) => (
          <Chip
            key={chip.id}
            label={chip.label}
            onRemove={chip.onRemove}
            className="bg-primary/10 border-primary/20"
            labelClassName="text-primary font-medium text-[11px]"
          />
        ))}

        {/* Clear All Button */}
        <Pressable
          onPress={onClearAll}
          className="justify-center px-2 py-1 rounded-full bg-muted/70 active:bg-muted"
          accessibilityLabel="Clear all filters"
        >
          <Text className="text-[11px] font-bold text-destructive">Clear All</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default AdminActiveFilterChips;
