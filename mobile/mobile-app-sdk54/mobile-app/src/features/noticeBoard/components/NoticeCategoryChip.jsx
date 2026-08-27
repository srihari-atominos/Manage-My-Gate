import React from 'react';
import { Chip } from '@/components/common/Chip';
import { ShieldAlert, Wrench, Calendar, Building2, Megaphone } from 'lucide-react-native';

const CATEGORY_ICONS = {
  Emergency: ShieldAlert,
  Maintenance: Wrench,
  Events: Calendar,
  Meetings: Building2,
};

/**
 * NoticeCategoryChip Component
 * Wraps global Chip to display interactive notice category filter tabs.
 */
export function NoticeCategoryChip({ category, selected, onPress, className }) {
  const IconComponent = CATEGORY_ICONS[category] || Megaphone;

  return (
    <Chip
      label={category}
      icon={category === 'All' ? undefined : IconComponent}
      selected={selected}
      onPress={onPress}
      className={className}
    />
  );
}

export default NoticeCategoryChip;
