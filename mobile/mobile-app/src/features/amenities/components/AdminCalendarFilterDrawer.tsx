import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput as RNTextInput, Pressable, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/common/Chip';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  Layers,
  Search,
  X,
  Boxes,
  Tag,
  CircleDollarSign,
  RotateCcw,
  Check,
} from 'lucide-react-native';

export interface CalendarFilterState {
  facilityIds: string[]; // multi-select; empty or ['All'] means All
  resourceIds: string[]; // multi-select; empty means All
  availability: string; // 'ALL' | 'AVAILABLE' | ...
  bookingStatuses: string[]; // multi-select; empty means All
  paymentStatuses: string[]; // multi-select; empty means All
}

export interface AdminCalendarFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: CalendarFilterState;
  onApply: (newFilters: CalendarFilterState) => void;
  onReset: () => void;
  amenities: Array<{ _id: string; name: string; category?: string }>;
  availableResources?: Array<{ _id: string; name: string; facilityId?: string }>;
}

const STATUS_OPTIONS = [
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Checked In', value: 'CHECKED_IN' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const PAYMENT_OPTIONS = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Not Required', value: 'NOT_REQUIRED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export function AdminCalendarFilterDrawer({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  amenities,
  availableResources = [],
}: AdminCalendarFilterDrawerProps) {
  const [draft, setDraft] = useState<CalendarFilterState>(filters);
  const [facilitySearch, setFacilitySearch] = useState('');

  // Sync draft whenever drawer opens
  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setFacilitySearch('');
    }
  }, [visible, filters]);

  // Specific facilities selected (excluding 'All')
  const specificFacilityIds = useMemo(
    () => draft.facilityIds.filter((id) => id !== 'All'),
    [draft.facilityIds]
  );
  const isAllFacilities = specificFacilityIds.length === 0;

  // Filtered available facilities based on search (user searches to find them; no default chips shown)
  const filteredAmenities = useMemo(() => {
    if (!facilitySearch.trim()) return [];
    const q = facilitySearch.toLowerCase().trim();
    return amenities.filter((a) => a.name.toLowerCase().includes(q));
  }, [amenities, facilitySearch]);

  // Resources available for the selected facilities
  const applicableResources = useMemo(() => {
    if (isAllFacilities) return availableResources;
    const facIdSet = new Set(specificFacilityIds);
    return availableResources.filter((r) => r.facilityId && facIdSet.has(r.facilityId));
  }, [availableResources, specificFacilityIds, isAllFacilities]);

  // Handle facility toggle
  const handleToggleFacility = (id: string) => {
    if (id === 'All') {
      setDraft((p) => ({ ...p, facilityIds: [] }));
      return;
    }

    setDraft((p) => {
      const current = p.facilityIds.filter((fid) => fid !== 'All');
      const isSelected = current.includes(id);
      const next = isSelected ? current.filter((fid) => fid !== id) : [...current, id];
      return { ...p, facilityIds: next };
    });
  };

  // Handle resource toggle
  const handleToggleResource = (id: string) => {
    if (id === 'All') {
      setDraft((p) => ({ ...p, resourceIds: [] }));
      return;
    }
    setDraft((p) => {
      const isSelected = p.resourceIds.includes(id);
      const next = isSelected ? p.resourceIds.filter((rid) => rid !== id) : [...p.resourceIds, id];
      return { ...p, resourceIds: next };
    });
  };

  // Handle booking status toggle
  const handleToggleBookingStatus = (status: string) => {
    if (status === 'All') {
      setDraft((p) => ({ ...p, bookingStatuses: [] }));
      return;
    }
    setDraft((p) => {
      const isSelected = p.bookingStatuses.includes(status);
      const next = isSelected
        ? p.bookingStatuses.filter((s) => s !== status)
        : [...p.bookingStatuses, status];
      return { ...p, bookingStatuses: next };
    });
  };

  // Handle payment status toggle
  const handleTogglePaymentStatus = (payment: string) => {
    if (payment === 'All') {
      setDraft((p) => ({ ...p, paymentStatuses: [] }));
      return;
    }
    setDraft((p) => {
      const isSelected = p.paymentStatuses.includes(payment);
      const next = isSelected
        ? p.paymentStatuses.filter((s) => s !== payment)
        : [...p.paymentStatuses, payment];
      return { ...p, paymentStatuses: next };
    });
  };

  const currentSelectionCount =
    specificFacilityIds.length +
    draft.resourceIds.length +
    draft.bookingStatuses.length +
    draft.paymentStatuses.length;

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft({
      facilityIds: [],
      resourceIds: [],
      availability: 'ALL',
      bookingStatuses: [],
      paymentStatuses: [],
    });
    setFacilitySearch('');
    onReset();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filter Reservations & Schedule">
      <View className="gap-5 pb-6">
        {/* 1. FACILITY / FEATURE (Multi-Select with Search) */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Layers size={16} className="text-primary" />
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Facility / Feature ({amenities.length})
              </Text>
            </View>
            {specificFacilityIds.length > 0 && (
              <Text className="text-[11px] font-semibold text-primary">
                Selected ({specificFacilityIds.length})
              </Text>
            )}
          </View>

          {/* Facility Search Field */}
          <View className="flex-row items-center bg-card border border-border/80 rounded-xl px-3 h-9 shadow-2xs">
            <Icon as={Search} size={14} className="text-muted-foreground mr-2" />
            <RNTextInput
              value={facilitySearch}
              onChangeText={setFacilitySearch}
              placeholder="Search facility or feature..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-xs text-foreground font-normal py-0"
              accessibilityLabel="Search facility or feature"
            />
            {Boolean(facilitySearch) && (
              <Pressable onPress={() => setFacilitySearch('')} className="p-1">
                <Icon as={X} size={13} className="text-muted-foreground" />
              </Pressable>
            )}
          </View>

          {/* Selected Facilities Chips Row (with X) */}
          {specificFacilityIds.length > 0 && (
            <View className="gap-1">
              <Text className="text-[11px] text-muted-foreground font-medium">Selected:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 py-0.5">
                {specificFacilityIds.map((facId) => {
                  const facility = amenities.find((a) => a._id === facId);
                  return (
                    <Chip
                      key={`selected-fac-${facId}`}
                      label={facility ? facility.name : facId}
                      onRemove={() => handleToggleFacility(facId)}
                      className="bg-primary border-primary h-7 px-2.5"
                      labelClassName="text-primary-foreground font-medium text-xs"
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Available Facilities Options */}
          <View className="flex-row flex-wrap gap-2">
            {/* All Facilities Option (shown by default when not searching or when searching 'all') */}
            {(!facilitySearch.trim() || 'all facilities'.includes(facilitySearch.trim().toLowerCase())) && (
              <Chip
                label="All Facilities"
                selected={isAllFacilities}
                className={isAllFacilities ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                onPress={() => handleToggleFacility('All')}
              />
            )}

            {filteredAmenities.map((a) => {
              const isSelected = specificFacilityIds.includes(a._id);
              return (
                <Chip
                  key={a._id}
                  label={a.name}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => handleToggleFacility(a._id)}
                />
              );
            })}

            {Boolean(facilitySearch.trim()) && filteredAmenities.length === 0 && (
              <Text className="text-xs text-muted-foreground italic py-1">
                No facilities found matching "{facilitySearch}"
              </Text>
            )}
          </View>
        </View>

        {/* 2. RESOURCE FILTER (Dependent on Selected Facilities) */}
        {applicableResources.length > 0 && (
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Boxes size={16} className="text-primary" />
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                  Resource ({applicableResources.length})
                </Text>
              </View>
              {draft.resourceIds.length > 0 && (
                <Text className="text-[11px] font-semibold text-primary">
                  Selected ({draft.resourceIds.length})
                </Text>
              )}
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="All Resources"
                selected={draft.resourceIds.length === 0}
                className={draft.resourceIds.length === 0 ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                onPress={() => handleToggleResource('All')}
              />
              {applicableResources.map((res) => {
                const isSelected = draft.resourceIds.includes(res._id);
                return (
                  <Chip
                    key={res._id}
                    label={res.name}
                    selected={isSelected}
                    className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                    onPress={() => handleToggleResource(res._id)}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* 3. BOOKING STATUS (Multi-Select) */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Tag size={16} className="text-primary" />
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Booking Status
              </Text>
            </View>
            {draft.bookingStatuses.length > 0 && (
              <Text className="text-[11px] font-semibold text-primary">
                Selected ({draft.bookingStatuses.length})
              </Text>
            )}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="All"
              selected={draft.bookingStatuses.length === 0}
              className={draft.bookingStatuses.length === 0 ? 'bg-primary border-primary' : 'bg-card border-border/70'}
              onPress={() => handleToggleBookingStatus('All')}
            />
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = draft.bookingStatuses.includes(opt.value);
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => handleToggleBookingStatus(opt.value)}
                />
              );
            })}
          </View>
        </View>

        {/* 4. PAYMENT STATUS (Multi-Select) */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <CircleDollarSign size={16} className="text-primary" />
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Payment Status
              </Text>
            </View>
            {draft.paymentStatuses.length > 0 && (
              <Text className="text-[11px] font-semibold text-primary">
                Selected ({draft.paymentStatuses.length})
              </Text>
            )}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="All"
              selected={draft.paymentStatuses.length === 0}
              className={draft.paymentStatuses.length === 0 ? 'bg-primary border-primary' : 'bg-card border-border/70'}
              onPress={() => handleTogglePaymentStatus('All')}
            />
            {PAYMENT_OPTIONS.map((opt) => {
              const isSelected = draft.paymentStatuses.includes(opt.value);
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={isSelected}
                  className={isSelected ? 'bg-primary border-primary' : 'bg-card border-border/70'}
                  onPress={() => handleTogglePaymentStatus(opt.value)}
                />
              );
            })}
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View className="flex-row gap-3 pt-3 border-t border-border/60 mt-2">
          <Button
            variant="outline"
            className="flex-1 flex-row items-center justify-center gap-2 border-border"
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
          >
            <RotateCcw size={16} className="text-foreground" />
            <Text className="font-semibold text-foreground text-sm font-sans">Reset All</Text>
          </Button>
          <Button
            variant="default"
            className="flex-1 flex-row items-center justify-center gap-2 bg-primary"
            onPress={handleApply}
            accessibilityRole="button"
            accessibilityLabel="Apply selected filters"
          >
            <Check size={16} className="text-primary-foreground" />
            <Text className="font-semibold text-primary-foreground text-sm font-sans">
              {currentSelectionCount > 0
                ? `Apply Filters (${currentSelectionCount})`
                : 'Apply Filters'}
            </Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default AdminCalendarFilterDrawer;
