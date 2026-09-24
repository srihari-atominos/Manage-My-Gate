import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput as RNTextInput, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { Chip } from '@/components/common/Chip';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  Layers,
  Search,
  X,
  Boxes,
  Tag,
  CircleDollarSign,
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

const AVAILABILITY_OPTIONS = [
  { id: 'ALL', label: 'All Availability' },
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'PARTIALLY_AVAILABLE', label: 'Partially Available' },
  { id: 'FULLY_BOOKED', label: 'Fully Booked' },
];

const STATUS_OPTIONS = [
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'CHECKED_IN', label: 'Checked In' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const PAYMENT_OPTIONS = [
  { id: 'PAID', label: 'Paid' },
  { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'NOT_REQUIRED', label: 'Not Required' },
  { id: 'REFUNDED', label: 'Refunded' },
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

  // Filtered available facilities based on search
  const filteredAmenities = useMemo(() => {
    if (!facilitySearch.trim()) return [];
    const q = facilitySearch.toLowerCase().trim();
    return amenities.filter((a) => a.name.toLowerCase().includes(q));
  }, [amenities, facilitySearch]);

  // Derived applicable resources based on selected facilities
  const applicableResources = useMemo(() => {
    if (specificFacilityIds.length === 0) return availableResources;
    return availableResources.filter((res) =>
      res.facilityId ? specificFacilityIds.includes(res.facilityId) : true
    );
  }, [specificFacilityIds, availableResources]);

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
      const next = isSelected
        ? p.resourceIds.filter((rid) => rid !== id)
        : [...p.resourceIds, id];
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

  // Apply filters
  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  // Reset filters
  const handleReset = () => {
    const cleared: CalendarFilterState = {
      facilityIds: [],
      resourceIds: [],
      availability: 'ALL',
      bookingStatuses: [],
      paymentStatuses: [],
    };
    setDraft(cleared);
    setFacilitySearch('');
    onReset();
    onClose();
  };

  const currentSelectionCount =
    (isAllFacilities ? 0 : specificFacilityIds.length) +
    draft.resourceIds.length +
    (draft.availability !== 'ALL' ? 1 : 0) +
    draft.bookingStatuses.length +
    draft.paymentStatuses.length;

  const renderFacilitySection = () => (
    <View className="gap-3 pt-1">
      {/* Search Input for Facilities */}
      <View className="flex-row items-center bg-card border border-border/80 rounded-xl px-2.5 h-10">
        <Icon as={Search} size={14} className="text-muted-foreground me-2 shrink-0" />
        <RNTextInput
          value={facilitySearch}
          onChangeText={setFacilitySearch}
          placeholder="Search facility or feature..."
          placeholderTextColor="#9ca3af"
          className="flex-1 text-xs text-foreground font-sans p-0"
        />
        {facilitySearch ? (
          <Pressable onPress={() => setFacilitySearch('')} hitSlop={6}>
            <Icon as={X} size={14} className="text-muted-foreground" />
          </Pressable>
        ) : null}
      </View>

      {/* Quick All Chip */}
      <View className="flex-row flex-wrap gap-2">
        <Chip
          label="All Facilities"
          selected={isAllFacilities}
          onPress={() => handleToggleFacility('All')}
          className="py-1.5 px-3"
        />
        {amenities.map((a) => {
          const isSelected = specificFacilityIds.includes(a._id);
          // Only show when searched or selected
          const isSearching = Boolean(facilitySearch.trim());
          const matches = isSearching && a.name.toLowerCase().includes(facilitySearch.toLowerCase().trim());
          if (!isSearching && !isSelected) return null;
          if (isSearching && !matches) return null;

          return (
            <Chip
              key={a._id}
              label={a.name}
              selected={isSelected}
              onPress={() => handleToggleFacility(a._id)}
              className="py-1.5 px-3"
            />
          );
        })}
      </View>

      {/* Resources section if applicable */}
      {applicableResources.length > 0 && (
        <View className="gap-2 pt-2 border-t border-border/40 mt-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
            Resources
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="All Resources"
              selected={draft.resourceIds.length === 0}
              onPress={() => handleToggleResource('All')}
              className="py-1.5 px-3"
            />
            {applicableResources.map((res) => {
              const isSelected = draft.resourceIds.includes(res._id);
              return (
                <Chip
                  key={res._id}
                  label={res.name}
                  selected={isSelected}
                  onPress={() => handleToggleResource(res._id)}
                  className="py-1.5 px-3"
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => [
    {
      id: 'facilities',
      label: 'Facilities',
      icon: Layers,
      type: 'custom',
      selectedCount: (isAllFacilities ? 0 : specificFacilityIds.length) + draft.resourceIds.length,
      renderCustom: renderFacilitySection,
    },
    {
      id: 'availability',
      label: 'Availability Status',
      icon: Boxes,
      type: 'radio',
      options: AVAILABILITY_OPTIONS,
      selectedValues: draft.availability,
      selectedCount: draft.availability !== 'ALL' ? 1 : 0,
      onOptionSelect: (val) => setDraft((p) => ({ ...p, availability: val })),
    },
    {
      id: 'bookingStatus',
      label: 'Booking Status',
      icon: Tag,
      type: 'checkbox',
      options: STATUS_OPTIONS,
      selectedValues: draft.bookingStatuses,
      selectedCount: draft.bookingStatuses.length,
      onOptionToggle: handleToggleBookingStatus,
    },
    {
      id: 'paymentStatus',
      label: 'Payment Status',
      icon: CircleDollarSign,
      type: 'checkbox',
      options: PAYMENT_OPTIONS,
      selectedValues: draft.paymentStatuses,
      selectedCount: draft.paymentStatuses.length,
      onOptionToggle: handleTogglePaymentStatus,
    },
  ], [draft, isAllFacilities, specificFacilityIds, facilitySearch, amenities, applicableResources]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title="Filter Calendar Schedule"
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleReset}
      applyLabel={currentSelectionCount > 0 ? `Apply Filters (${currentSelectionCount})` : 'Apply Filters'}
      totalActiveCount={currentSelectionCount}
    />
  );
}

export default AdminCalendarFilterDrawer;
