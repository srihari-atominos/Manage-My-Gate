import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  Tag,
  AlertCircle,
  CheckSquare,
  Camera,
  Calendar,
  ShieldAlert,
  Wrench,
  Building2,
  Megaphone,
} from 'lucide-react-native';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { useTranslation } from '@/src/utils/i18n';

export interface ActiveBoardFilterValues {
  categories: string[];
  priorities: string[];
  requiresSignoffOnly: boolean;
  unreadOnly: boolean;
  isPinnedOnly: boolean;
  hasImagesOnly: boolean;
  hasDocsOnly: boolean;
  datePreset: 'ALL_TIME' | 'TODAY' | 'THIS_WEEK' | 'PAST_30_DAYS';
}

export const DEFAULT_ACTIVE_BOARD_FILTERS: ActiveBoardFilterValues = {
  categories: [],
  priorities: [],
  requiresSignoffOnly: false,
  unreadOnly: false,
  isPinnedOnly: false,
  hasImagesOnly: false,
  hasDocsOnly: false,
  datePreset: 'ALL_TIME',
};

export interface ActiveBoardFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: ActiveBoardFilterValues;
  onApply: (filters: ActiveBoardFilterValues) => void;
  onReset: () => void;
  matchCount?: number;
}

export const ActiveBoardFilterDrawer: React.FC<ActiveBoardFilterDrawerProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  matchCount,
}) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<string[]>(filters.categories || []);
  const [priorities, setPriorities] = useState<string[]>(filters.priorities || []);
  const [requiresSignoffOnly, setRequiresSignoffOnly] = useState<boolean>(
    filters.requiresSignoffOnly || false
  );
  const [unreadOnly, setUnreadOnly] = useState<boolean>(filters.unreadOnly || false);
  const [isPinnedOnly, setIsPinnedOnly] = useState<boolean>(filters.isPinnedOnly || false);
  const [hasImagesOnly, setHasImagesOnly] = useState<boolean>(filters.hasImagesOnly || false);
  const [hasDocsOnly, setHasDocsOnly] = useState<boolean>(filters.hasDocsOnly || false);
  const [datePreset, setDatePreset] = useState<ActiveBoardFilterValues['datePreset']>(
    filters.datePreset || 'ALL_TIME'
  );

  const categoryOptions = useMemo(
    () => [
      { id: 'General', label: t('general', 'General'), icon: Megaphone },
      { id: 'Maintenance', label: t('maintenance', 'Maintenance'), icon: Wrench },
      { id: 'Events', label: t('events', 'Events'), icon: Calendar },
      { id: 'Emergency', label: t('emergency', 'Emergency'), icon: ShieldAlert },
      { id: 'Meetings', label: t('meetings', 'Meetings'), icon: Building2 },
    ],
    [t]
  );

  const priorityOptions = useMemo(
    () => [
      { id: 'Critical', label: t('critical', 'Critical') },
      { id: 'High', label: t('priority_high', 'High Priority') },
      { id: 'Medium', label: t('priority_medium', 'Medium') },
      { id: 'Low', label: t('priority_low', 'Low') },
    ],
    [t]
  );

  const datePresets = useMemo(
    () => [
      { id: 'ALL_TIME' as const, label: t('all_time', 'All Time') },
      { id: 'TODAY' as const, label: t('today', 'Today') },
      { id: 'THIS_WEEK' as const, label: t('this_week', 'This Week') },
      { id: 'PAST_30_DAYS' as const, label: t('past_30_days', 'Past 30 Days') },
    ],
    [t]
  );

  // Sync state when filters prop updates or becomes visible
  useEffect(() => {
    if (visible) {
      setCategories(filters.categories || []);
      setPriorities(filters.priorities || []);
      setRequiresSignoffOnly(filters.requiresSignoffOnly || false);
      setUnreadOnly(filters.unreadOnly || false);
      setIsPinnedOnly(filters.isPinnedOnly || false);
      setHasImagesOnly(filters.hasImagesOnly || false);
      setHasDocsOnly(filters.hasDocsOnly || false);
      setDatePreset(filters.datePreset || 'ALL_TIME');
    }
  }, [filters, visible]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const togglePriority = (prio: string) => {
    setPriorities((prev) =>
      prev.includes(prio) ? prev.filter((p) => p !== prio) : [...prev, prio]
    );
  };

  const handleApply = () => {
    onApply({
      categories,
      priorities,
      requiresSignoffOnly,
      unreadOnly,
      isPinnedOnly,
      hasImagesOnly,
      hasDocsOnly,
      datePreset,
    });
    onClose();
  };

  const handleReset = () => {
    setCategories([]);
    setPriorities([]);
    setRequiresSignoffOnly(false);
    setUnreadOnly(false);
    setIsPinnedOnly(false);
    setHasImagesOnly(false);
    setHasDocsOnly(false);
    setDatePreset('ALL_TIME');
    onReset();
    onClose();
  };

  const totalActiveCount =
    categories.length +
    priorities.length +
    (requiresSignoffOnly ? 1 : 0) +
    (unreadOnly ? 1 : 0) +
    (isPinnedOnly ? 1 : 0) +
    (hasImagesOnly ? 1 : 0) +
    (hasDocsOnly ? 1 : 0) +
    (datePreset !== 'ALL_TIME' ? 1 : 0);

  // Define two-pane category configs
  const categoryConfigs: FilterCategoryConfig[] = useMemo(() => [
    {
      id: 'category',
      label: t('category', 'Category'),
      icon: Megaphone,
      type: 'checkbox',
      options: categoryOptions,
      selectedValues: categories,
      selectedCount: categories.length,
      onOptionToggle: toggleCategory,
    },
    {
      id: 'priority',
      label: t('urgency_priority', 'Urgency & Priority'),
      icon: AlertCircle,
      type: 'checkbox',
      options: priorityOptions,
      selectedValues: priorities,
      selectedCount: priorities.length,
      onOptionToggle: togglePriority,
    },
    {
      id: 'governance',
      label: t('action_governance', 'Action & Governance'),
      icon: CheckSquare,
      type: 'toggle',
      options: [
        {
          id: 'signoff',
          label: t('needs_my_signoff', 'Needs My Sign-off'),
          description: t('needs_signoff_desc', 'Notices requiring resident acknowledgment'),
        },
        {
          id: 'unread',
          label: t('unread_announcements_only', 'Unread Announcements Only'),
          description: t('unread_desc', 'Updates you have not yet opened'),
        },
        {
          id: 'pinned',
          label: t('pinned_announcements_only', 'Pinned Announcements Only'),
          description: t('pinned_desc', 'Important bulletins pinned by management'),
        },
      ],
      selectedValues: [
        ...(requiresSignoffOnly ? ['signoff'] : []),
        ...(unreadOnly ? ['unread'] : []),
        ...(isPinnedOnly ? ['pinned'] : []),
      ],
      selectedCount:
        (requiresSignoffOnly ? 1 : 0) +
        (unreadOnly ? 1 : 0) +
        (isPinnedOnly ? 1 : 0),
      onOptionToggle: (id) => {
        if (id === 'signoff') setRequiresSignoffOnly((prev) => !prev);
        if (id === 'unread') setUnreadOnly((prev) => !prev);
        if (id === 'pinned') setIsPinnedOnly((prev) => !prev);
      },
    },
    {
      id: 'media',
      label: t('media_attachments', 'Media & Attachments'),
      icon: Camera,
      type: 'toggle',
      options: [
        { id: 'photos', label: t('has_photos', 'Has Photos'), description: t('has_photos_desc', 'Notices with attached image galleries') },
        { id: 'docs', label: t('has_documents', 'Has Documents'), description: t('has_docs_desc', 'Notices with attached PDF or doc files') },
      ],
      selectedValues: [
        ...(hasImagesOnly ? ['photos'] : []),
        ...(hasDocsOnly ? ['docs'] : []),
      ],
      selectedCount: (hasImagesOnly ? 1 : 0) + (hasDocsOnly ? 1 : 0),
      onOptionToggle: (id) => {
        if (id === 'photos') setHasImagesOnly((prev) => !prev);
        if (id === 'docs') setHasDocsOnly((prev) => !prev);
      },
    },
    {
      id: 'date',
      label: t('date_posted', 'Date Posted'),
      icon: Calendar,
      type: 'radio',
      options: datePresets,
      selectedValues: datePreset,
      selectedCount: datePreset !== 'ALL_TIME' ? 1 : 0,
      onOptionSelect: (val) => setDatePreset(val as any),
    },
  ], [
    t,
    categoryOptions,
    priorityOptions,
    datePresets,
    categories,
    priorities,
    requiresSignoffOnly,
    unreadOnly,
    isPinnedOnly,
    hasImagesOnly,
    hasDocsOnly,
    datePreset,
  ]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title={t('filter_announcements', 'Filter Announcements')}
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleReset}
      totalActiveCount={totalActiveCount}
      applyLabel={matchCount !== undefined ? `${t('apply', 'Apply')} (${matchCount})` : undefined}
    />
  );
};

export default ActiveBoardFilterDrawer;
