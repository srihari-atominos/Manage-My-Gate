import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { SearchBar } from '@/components/forms/SearchBar';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export const CATEGORIES = {
  GENERAL: 'General',
  MAINTENANCE: 'Maintenance',
  EVENTS: 'Events',
  EMERGENCY: 'Emergency',
  MEETINGS: 'Meetings',
};

export const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const STATUSES = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  EXPIRED: 'Expired',
  SCHEDULED: 'Scheduled',
  ARCHIVED: 'Archived',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' as const },
  { value: 'oldest', label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' as const },
  { value: 'priority', label: 'Highest Priority', sortBy: 'priority', sortOrder: 'desc' as const },
  { value: 'title_asc', label: 'Title (A-Z)', sortBy: 'title', sortOrder: 'asc' as const },
  { value: 'title_desc', label: 'Title (Z-A)', sortBy: 'title', sortOrder: 'desc' as const },
];

export interface NoticeFiltersState {
  category?: string;
  priority?: string;
  status?: string;
  isBookmarked?: boolean | string;
  readStatus?: string;
  [key: string]: any;
}

export interface NoticeSortState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface NoticeManagementFilterBarProps {
  search: string;
  filters: NoticeFiltersState;
  sort: NoticeSortState;
  onSearchChange: (text: string) => void;
  onFiltersChange: (filters: Partial<NoticeFiltersState>) => void;
  onSortChange?: (sort: NoticeSortState) => void;
  onReset: () => void;
  hideStatusFilter?: boolean;
  showNoticeTypeFilter?: boolean;
  className?: string;
}

export const NoticeManagementFilterBar: React.FC<NoticeManagementFilterBarProps> = ({
  search,
  filters,
  sort,
  onSearchChange,
  onFiltersChange,
  onSortChange,
  onReset,
  hideStatusFilter = false,
  showNoticeTypeFilter = false,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(search);

  useEffect(() => {
    setSearchTerm(search);
  }, [search]);

  const handleSearchSubmit = () => {
    onSearchChange(searchTerm);
  };

  const handleSortSelect = (value: string) => {
    const selected = SORT_OPTIONS.find((opt) => opt.value === value);
    if (selected) {
      if (onSortChange) {
        onSortChange({ sortBy: selected.sortBy, sortOrder: selected.sortOrder });
      } else {
        onFiltersChange({ sortBy: selected.sortBy, sortOrder: selected.sortOrder });
      }
    }
  };

  const activeSortOption =
    SORT_OPTIONS.find((opt) => opt.sortBy === sort.sortBy && opt.sortOrder === sort.sortOrder)?.value ||
    'newest';

  const getNoticeType = () => {
    if (filters.isBookmarked === 'true' || filters.isBookmarked === true) return 'Bookmarks';
    if (filters.readStatus === 'Unread') return 'Unread';
    return 'All';
  };

  const handleNoticeTypeChange = (val: string) => {
    if (val === 'Bookmarks') {
      onFiltersChange({ isBookmarked: 'true', readStatus: '' });
    } else if (val === 'Unread') {
      onFiltersChange({ readStatus: 'Unread', isBookmarked: '' });
    } else {
      onFiltersChange({ readStatus: '', isBookmarked: '' });
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View className={`gap-2.5 ${className}`}>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <SearchBar
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              if (text === '') onSearchChange('');
            }}
            placeholder="Search Notices..."
            onClear={() => onSearchChange('')}
          />
        </View>
        <Button variant="outline" size="sm" onPress={onReset} className="h-11 px-3.5 rounded-xl">
          <Text className="text-xs font-semibold text-foreground">Reset</Text>
        </Button>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="flex-1 min-w-[130px]">
          <DropdownSelect
            options={[
              { label: 'All Categories', value: '' },
              ...Object.values(CATEGORIES).map((cat) => ({ label: cat, value: cat })),
            ]}
            value={filters.category || ''}
            onValueChange={(val) => onFiltersChange({ category: val })}
            placeholder="Category"
            inline={isWeb}
          />
        </View>

        <View className="flex-1 min-w-[130px]">
          <DropdownSelect
            options={[
              { label: 'All Priorities', value: '' },
              ...Object.values(PRIORITIES).map((pri) => ({ label: pri, value: pri })),
            ]}
            value={filters.priority || ''}
            onValueChange={(val) => onFiltersChange({ priority: val })}
            placeholder="Priority"
            inline={isWeb}
          />
        </View>

        <View className="flex-1 min-w-[130px]">
          <DropdownSelect
            options={SORT_OPTIONS}
            value={activeSortOption}
            onValueChange={handleSortSelect}
            placeholder="Sort By"
            inline={isWeb}
          />
        </View>

        {showNoticeTypeFilter && (
          <View className="flex-1 min-w-[130px]">
            <DropdownSelect
              options={[
                { label: 'All Notices', value: 'All' },
                { label: 'Unread', value: 'Unread' },
                { label: 'Bookmarks', value: 'Bookmarks' },
              ]}
              value={getNoticeType()}
              onValueChange={handleNoticeTypeChange}
              placeholder="Notice Type"
              inline={isWeb}
            />
          </View>
        )}

        {!hideStatusFilter && (
          <View className="flex-1 min-w-[130px]">
            <DropdownSelect
              options={[
                { label: 'All Statuses', value: '' },
                ...Object.values(STATUSES).map((st) => ({ label: st, value: st })),
              ]}
              value={filters.status || ''}
              onValueChange={(val) => onFiltersChange({ status: val })}
              placeholder="Status"
              inline={isWeb}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default NoticeManagementFilterBar;
