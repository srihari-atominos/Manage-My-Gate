import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  RotateCcw,
  Check,
  Layers,
  Tag,
  CircleDollarSign,
  Users,
  Timer,
  Sparkles,
  DoorOpen,
  Wrench,
} from 'lucide-react-native';
import { AmenityArchetype } from '../types/amenityDomain.types';
import { AmenityFilterValues } from '../hooks/useAmenityMaster';

interface AmenityFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: AmenityFilterValues;
  availableCategories: string[];
  onApply: (newFilters: AmenityFilterValues) => void;
  onReset: () => void;
}

interface ArchetypeOption {
  label: string;
  value: AmenityArchetype;
  icon: any;
}

const ARCHETYPE_OPTIONS: ArchetypeOption[] = [
  { label: 'Shared Capacity', value: 'SHARED_CAPACITY', icon: Users },
  { label: 'Exclusive Hourly', value: 'EXCLUSIVE_HOURLY', icon: Timer },
  { label: 'Event Space', value: 'EVENT_SPACE', icon: Sparkles },
  { label: 'Room Resource', value: 'ROOM_RESOURCE', icon: DoorOpen },
  { label: 'Inventory & Tools', value: 'INVENTORY_TOOLS', icon: Wrench },
];

const PRICING_OPTIONS = [
  { id: 'ALL', label: 'All Pricing' },
  { id: 'FREE', label: 'Complimentary (Free)' },
  { id: 'PAID', label: 'Paid / Chargeable' },
];

export const AmenityFilterDrawer: React.FC<AmenityFilterDrawerProps> = ({
  visible,
  onClose,
  filters,
  availableCategories = [],
  onApply,
  onReset,
}) => {
  const [selectedArchetypes, setSelectedArchetypes] = useState<AmenityArchetype[]>(
    filters.archetypes || []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    filters.categories || []
  );
  const [selectedPricing, setSelectedPricing] = useState<'ALL' | 'FREE' | 'PAID'>(
    filters.pricingModel || 'ALL'
  );

  useEffect(() => {
    if (visible) {
      setSelectedArchetypes(filters.archetypes || []);
      setSelectedCategories(filters.categories || []);
      setSelectedPricing(filters.pricingModel || 'ALL');
    }
  }, [visible, filters]);

  const toggleArchetype = (archetype: AmenityArchetype) => {
    setSelectedArchetypes((prev) =>
      prev.includes(archetype)
        ? prev.filter((item) => item !== archetype)
        : [...prev, archetype]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const handleApplyInternal = () => {
    onApply({
      archetypes: selectedArchetypes,
      categories: selectedCategories,
      pricingModel: selectedPricing,
    });
    onClose();
  };

  const handleResetInternal = () => {
    setSelectedArchetypes([]);
    setSelectedCategories([]);
    setSelectedPricing('ALL');
    onReset();
    onClose();
  };

  const currentSelectionCount =
    selectedArchetypes.length +
    selectedCategories.length +
    (selectedPricing !== 'ALL' ? 1 : 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filter Amenities">
      <View className="gap-6 py-2">
        {/* Section 1: Archetypes (Multi-Select) */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <Layers size={16} className="text-primary" />
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
              Facility Archetypes (Multi-Select)
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {ARCHETYPE_OPTIONS.map((opt) => {
              const isSelected = selectedArchetypes.includes(opt.value);
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  icon={opt.icon}
                  selected={isSelected}
                  onPress={() => toggleArchetype(opt.value)}
                  className="h-8 px-3"
                />
              );
            })}
          </View>
        </View>

        {/* Section 2: Categories (Multi-Select) */}
        {availableCategories.length > 0 && (
          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <Tag size={16} className="text-primary" />
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Categories (Multi-Select)
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <Chip
                    key={cat}
                    label={cat}
                    selected={isSelected}
                    onPress={() => toggleCategory(cat)}
                    className="h-8 px-3"
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Section 3: Pricing Model */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <CircleDollarSign size={16} className="text-primary" />
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
              Pricing Model
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {PRICING_OPTIONS.map((opt) => {
              const isSelected = selectedPricing === opt.id;
              return (
                <Chip
                  key={opt.id}
                  label={opt.label}
                  selected={isSelected}
                  onPress={() => setSelectedPricing(opt.id as any)}
                  className="h-8 px-3"
                />
              );
            })}
          </View>
        </View>

        {/* Action Controls */}
        <View className="flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 flex-row items-center justify-center gap-2 border-border"
            onPress={handleResetInternal}
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
          >
            <RotateCcw size={16} className="text-foreground" />
            <Text className="font-semibold text-foreground text-sm font-sans">Reset All</Text>
          </Button>

          <Button
            variant="default"
            className="flex-1 flex-row items-center justify-center gap-2 bg-primary"
            onPress={handleApplyInternal}
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
};

export default AmenityFilterDrawer;
