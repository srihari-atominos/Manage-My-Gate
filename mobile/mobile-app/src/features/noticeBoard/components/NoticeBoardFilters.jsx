import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react-native';

const CATEGORIES = {
  GENERAL: 'General',
  MAINTENANCE: 'Maintenance',
  EVENTS: 'Events',
  EMERGENCY: 'Emergency',
  MEETINGS: 'Meetings',
};

const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const STATUSES = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  EXPIRED: 'Expired',
  SCHEDULED: 'Scheduled',
  ARCHIVED: 'Archived',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'oldest', label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
  { value: 'priority', label: 'Highest Priority', sortBy: 'priority', sortOrder: 'desc' },
  { value: 'title_asc', label: 'Title (A-Z)', sortBy: 'title', sortOrder: 'asc' },
  { value: 'title_desc', label: 'Title (Z-A)', sortBy: 'title', sortOrder: 'desc' },
];

export const NoticeBoardFilters = ({
  search,
  filters,
  sort,
  onSearchChange,
  onFiltersChange,
  onSortChange,
  onReset,
  hideStatusFilter = false,
  showNoticeTypeFilter = false,
}) => {
  const [searchTerm, setSearchTerm] = useState(search);

  useEffect(() => {
    setSearchTerm(search);
  }, [search]);

  const handleSearchSubmit = () => {
    onSearchChange(searchTerm);
  };

  const handleSortSelect = (value) => {
    const selected = SORT_OPTIONS.find((opt) => opt.value === value);
    if (selected) {
      if (onSortChange) {
        onSortChange({ sortBy: selected.sortBy, sortOrder: selected.sortOrder });
      } else {
        onFiltersChange({ sortBy: selected.sortBy, sortOrder: selected.sortOrder });
      }
    }
  };

  const activeSortOption = SORT_OPTIONS.find((opt) => opt.sortBy === sort.sortBy && opt.sortOrder === sort.sortOrder)?.value || 'newest';

  const getNoticeType = () => {
    if (filters.isBookmarked === 'true' || filters.isBookmarked === true) return 'Bookmarks';
    if (filters.readStatus === 'Unread') return 'Unread';
    return 'All';
  };

  const handleNoticeTypeChange = (val) => {
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
    <View className="mb-3">
      <View className="flex-row items-center mb-3">
        <View className="flex-1 me-2">
          <TextInput
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              if (text === '') onSearchChange('');
            }}
            placeholder="Search Notices"
            leftIcon={Search}
            onSubmitEditing={handleSearchSubmit}
          />
        </View>
        <Button variant="outline" size="sm" onPress={onReset}>
          Reset
        </Button>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="flex-1 min-w-[130px]" style={{ zIndex: 40 }}>
          <DropdownSelect
            options={[
              { label: 'All Categories', value: '' },
              ...Object.values(CATEGORIES).map(cat => ({ label: cat, value: cat }))
            ]}
            value={filters.category || ''}
            onValueChange={(val) => onFiltersChange({ category: val })}
            placeholder="Category"
            inline={isWeb}
          />
        </View>
        
        <View className="flex-1 min-w-[130px]" style={{ zIndex: 30 }}>
          <DropdownSelect
            options={[
              { label: 'All Priorities', value: '' },
              ...Object.values(PRIORITIES).map(pri => ({ label: pri, value: pri }))
            ]}
            value={filters.priority || ''}
            onValueChange={(val) => onFiltersChange({ priority: val })}
            placeholder="Priority"
            inline={isWeb}
          />
        </View>

        <View className="flex-1 min-w-[130px]" style={{ zIndex: 20 }}>
          <DropdownSelect
            options={SORT_OPTIONS}
            value={activeSortOption}
            onValueChange={handleSortSelect}
            placeholder="Sort By"
            inline={isWeb}
          />
        </View>

        {showNoticeTypeFilter && (
          <View className="flex-1 min-w-[130px]" style={{ zIndex: 10 }}>
            <DropdownSelect
              options={[
                { label: 'All Notices', value: 'All' },
                { label: 'Unread', value: 'Unread' },
                { label: 'Bookmarks', value: 'Bookmarks' }
              ]}
              value={getNoticeType()}
              onValueChange={handleNoticeTypeChange}
              placeholder="Notice Type"
              inline={isWeb}
            />
          </View>
        )}

        {!hideStatusFilter && (
          <View className="flex-1 min-w-[130px]" style={{ zIndex: 10 }}>
            <DropdownSelect
              options={[
                { label: 'All Statuses', value: '' },
                ...Object.values(STATUSES).map(st => ({ label: st, value: st }))
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

export default NoticeBoardFilters;
