import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GlobalFilterPanel, FilterCategoryConfig } from '@/components/ui/GlobalFilterPanel';
import { AlertTriangle, Bookmark, Eye, Layers } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';

const PRIORITIES = [
  { id: 'High', label: 'High Priority' },
  { id: 'Medium', label: 'Medium' },
  { id: 'Low', label: 'Low' },
];

const TYPES = [
  { id: 'Unread', label: 'Unread Only', icon: Eye },
  { id: 'Bookmarks', label: 'Bookmarks', icon: Bookmark },
];

const STATUSES = [
  { id: 'Published', label: 'Published' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Scheduled', label: 'Scheduled' },
  { id: 'Expired', label: 'Expired' },
  { id: 'Archived', label: 'Archived' },
];

export const NoticeFilterSheet = ({
  visible,
  onClose,
  filters = {},
  onApplyFilters,
  onResetFilters,
  showStatusFilter = false,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters || {});
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    const cleared = {
      ...draft,
      priority: '',
      readStatus: '',
      isBookmarked: '',
      status: '',
    };
    setDraft(cleared);
    if (onResetFilters) {
      onResetFilters();
    } else {
      onApplyFilters(cleared);
    }
    onClose();
  };

  const totalActiveCount =
    (draft.priority ? 1 : 0) +
    (draft.readStatus ? 1 : 0) +
    (draft.isBookmarked === 'true' || draft.isBookmarked === true ? 1 : 0) +
    (draft.status ? 1 : 0);

  const categoryConfigs = useMemo(() => {
    const list = [
      {
        id: 'priority',
        label: 'Priority',
        icon: AlertTriangle,
        type: 'radio',
        options: PRIORITIES,
        selectedValues: draft.priority || '',
        selectedCount: draft.priority ? 1 : 0,
        onOptionSelect: (val) => {
          setDraft((prev) => ({
            ...prev,
            priority: prev.priority === val ? '' : val,
          }));
        },
      },
      {
        id: 'type',
        label: 'Notice Type',
        icon: Bookmark,
        type: 'toggle',
        options: [
          { id: 'unread', label: 'Unread Only', description: 'Notices you have not yet opened' },
          { id: 'bookmarks', label: 'Bookmarked Notices', description: 'Announcements saved to your bookmarks' },
        ],
        selectedValues: [
          ...(draft.readStatus === 'Unread' ? ['unread'] : []),
          ...(draft.isBookmarked === 'true' || draft.isBookmarked === true ? ['bookmarks'] : []),
        ],
        selectedCount:
          (draft.readStatus === 'Unread' ? 1 : 0) +
          (draft.isBookmarked === 'true' || draft.isBookmarked === true ? 1 : 0),
        onOptionToggle: (id) => {
          if (id === 'unread') {
            setDraft((prev) => ({
              ...prev,
              readStatus: prev.readStatus === 'Unread' ? '' : 'Unread',
            }));
          } else if (id === 'bookmarks') {
            setDraft((prev) => ({
              ...prev,
              isBookmarked: prev.isBookmarked === 'true' || prev.isBookmarked === true ? '' : 'true',
            }));
          }
        },
      },
    ];

    if (showStatusFilter) {
      list.push({
        id: 'status',
        label: 'Status',
        icon: Layers,
        type: 'radio',
        options: STATUSES,
        selectedValues: draft.status || '',
        selectedCount: draft.status ? 1 : 0,
        onOptionSelect: (val) => {
          setDraft((prev) => ({
            ...prev,
            status: prev.status === val ? '' : val,
          }));
        },
      });
    }

    return list;
  }, [draft, showStatusFilter]);

  return (
    <GlobalFilterPanel
      visible={visible}
      onClose={onClose}
      title={t('filter_notices', 'Filter Notices')}
      categories={categoryConfigs}
      onApply={handleApply}
      onClearAll={handleReset}
      totalActiveCount={totalActiveCount}
    />
  );
};

export default NoticeFilterSheet;
