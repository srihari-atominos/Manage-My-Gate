import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  Layers,
  Tag,
  CircleDollarSign,
  Users,
  Timer,
  Sparkles,
  DoorOpen,
  Wrench,
} from 'lucide-react-native';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { AmenityArchetype } from '../types/amenityDomain.types';
import { AmenityFilterValues } from '../hooks/useAmenityMaster';
import { SECONDARY_CATEGORIES } from '../constants/amenityCatalogPresets';

interface AmenityFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: AmenityFilterValues;
  availableCategories: string[];
  onApply: (newFilters: AmenityFilterValues) => void;
  onReset: () => void;
}

interface ArchetypeOption {
  id: AmenityArchetype;
  label: string;
  icon: any;
}

const ARCHETYPE_OPTIONS: ArchetypeOption[] = [
  { id: 'SHARED_CAPACITY', label: 'Shared Capacity', icon: Users },
  { id: 'EXCLUSIVE_HOURLY', label: 'Exclusive Hourly', icon: Timer },
  { id: 'EVENT_SPACE', label: 'Event Space', icon: Sparkles },
  { id: 'ROOM_RESOURCE', label: 'Room Resource', icon: DoorOpen },
  { id: 'INVENTORY_TOOLS', label: 'Inventory & Tools', icon: Wrench },
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

  const toggleArchetype = (archetype: string) => {
    const arch = archetype as AmenityArchetype;
    setSelectedArchetypes((prev) =>
      prev.includes(arch) ? prev.filter((item) => item !== arch) : [...prev, arch]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const categoryOptions = useMemo(() => {
    const rawList =
      availableCategories && availableCategories.length > 0
        ? availableCategories
        : SECONDARY_CATEGORIES.map((c) => c.value);

    return rawList.map((item) => {
      const val = typeof item === 'string' ? item : (item as any)?.value || String(item);
      const meta = SECONDARY_CATEGORIES.find(
        (c) =>
          c.value.toLowerCase() === val.toLowerCase() ||
          c.label.toLowerCase() === val.toLowerCase()
      );
      return {
        id: meta ? meta.value : val,
        label: meta ? meta.label : val,
      };
    });
  }, [availableCategories]);

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

  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => [
    {
      id: 'archetypes',
      label: 'Archetypes',
      icon: Layers,
      type: 'checkbox',
      options: ARCHETYPE_OPTIONS,
      selectedValues: selectedArchetypes,
      selectedCount: selectedArchetypes.length,
      onOptionToggle: toggleArchetype,
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Tag,
      type: 'checkbox',
      options: categoryOptions,
      selectedValues: selectedCategories,
      selectedCount: selectedCategories.length,
      onOptionToggle: toggleCategory,
    },
    {
      id: 'pricing',
      label: 'Pricing Model',
      icon: CircleDollarSign,
      type: 'radio',
      options: PRICING_OPTIONS,
      selectedValues: selectedPricing,
      selectedCount: selectedPricing !== 'ALL' ? 1 : 0,
      onOptionSelect: (val) => setSelectedPricing(val as any),
    },
  ], [selectedArchetypes, selectedCategories, selectedPricing, categoryOptions]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title="Filter Amenities"
      categories={categoryConfigs}
      onApply={handleApplyInternal}
      onClearAll={handleResetInternal}
      totalActiveCount={currentSelectionCount}
    />
  );
};

export default AmenityFilterDrawer;
