import React from 'react';
import { Chip } from '@/components/common/Chip';
import { ShieldAlert, Wrench, Calendar, Building2, Megaphone } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';

const CATEGORY_ICONS = {
  Emergency: ShieldAlert,
  Maintenance: Wrench,
  Events: Calendar,
  Meetings: Building2,
};

/**
 * NoticeCategoryChip Component
 * Wraps global Chip to display interactive notice category filter tabs with full localization.
 */
export function NoticeCategoryChip({ category, selected, onPress, className = '' }) {
  const { t, tCategoryName } = useTranslation();
  const IconComponent = CATEGORY_ICONS[category] || Megaphone;

  const displayLabel = category === 'All'
    ? t('all', 'All')
    : tCategoryName(category, category);

  return (
    <Chip
      label={displayLabel}
      icon={category === 'All' ? undefined : IconComponent}
      selected={selected}
      onPress={onPress}
      className={className}
    />
  );
}

export default NoticeCategoryChip;
