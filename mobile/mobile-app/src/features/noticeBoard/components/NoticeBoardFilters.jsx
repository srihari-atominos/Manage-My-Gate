import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput as RNTextInput, Platform } from 'react-native';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Text } from '@/components/ui/text';
import { Search, X, RotateCcw } from 'lucide-react-native';
import { NoticeCategoryChip } from './NoticeCategoryChip';
import { useTranslation } from '@/src/utils/i18n';

const CATEGORIES = [
  'All',
  'General',
  'Maintenance',
  'Events',
  'Emergency',
  'Meetings',
];

const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
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
  const [searchTerm, setSearchTerm] = useState(search || '');

  useEffect(() => {
    setSearchTerm(search || '');
  }, [search]);

  const handleSearchSubmit = () => {
    onSearchChange(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onSearchChange('');
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

  const activeSortOption =
    SORT_OPTIONS.find((opt) => opt.sortBy === sort?.sortBy && opt.sortOrder === sort?.sortOrder)?.value || 'newest';

  const selectedCategory = filters?.category || 'All';

  const handleCategorySelect = (category) => {
    if (category === 'All') {
      onFiltersChange({ category: '' });
    } else {
      onFiltersChange({ category });
    }
  };

  const getNoticeType = () => {
    if (filters?.isBookmarked === 'true' || filters?.isBookmarked === true) return 'Bookmarks';
    if (filters?.readStatus === 'Unread') return 'Unread';
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

  const { t } = useTranslation();

  return (
    <View className="gap-2.5">
      {/* Search Bar & Reset Row */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center bg-secondary/80 border border-border rounded-xl px-3 h-10">
          <Search size={16} className="text-muted-foreground me-2" />
          <RNTextInput
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              if (text === '') onSearchChange('');
            }}
            placeholder={t('search_announcements', 'Search announcements...')}
            placeholderTextColor="#94a3b8"
            className="flex-1 text-[13.5px] font-sans font-medium text-foreground h-full p-0"
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} className="text-muted-foreground" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={onReset}
          activeOpacity={0.7}
          className="h-10 px-3 bg-secondary border border-border rounded-xl flex-row items-center gap-1.5 shrink-0"
          accessibilityLabel="Reset all filters"
        >
          <RotateCcw size={13} className="text-muted-foreground" />
          <Text className="text-[12px] font-bold font-sans text-foreground">{t('reset', 'Reset')}</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Scrollable Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
      >
        {CATEGORIES.map((cat) => (
          <NoticeCategoryChip
            key={cat}
            category={cat}
            selected={selectedCategory === cat || (cat === 'All' && !filters?.category)}
            onPress={() => handleCategorySelect(cat)}
          />
        ))}
      </ScrollView>

      {/* Structured Dropdown Filter Row */}
      <View className="flex-row items-center gap-2">
        {/* Priority Filter */}
        <View className="flex-1 min-w-[90px]">
          <DropdownSelect
            options={[
              { label: t('all_priorities', 'All Priorities'), value: '' },
              ...Object.values(PRIORITIES).map((pri) => ({ label: t(`priority_${pri.toLowerCase()}`, pri), value: pri })),
            ]}
            value={filters?.priority || ''}
            onValueChange={(val) => onFiltersChange({ priority: val })}
            placeholder={t('priority', 'Priority')}
            inline={false}
          />
        </View>

        {/* Notice Type (Resident) OR Status (Admin) */}
        {showNoticeTypeFilter ? (
          <View className="flex-1 min-w-[90px]">
            <DropdownSelect
              options={[
                { label: t('all_notices', 'All Notices'), value: 'All' },
                { label: t('unread', 'Unread'), value: 'Unread' },
                { label: t('bookmarks', 'Bookmarks'), value: 'Bookmarks' },
              ]}
              value={getNoticeType()}
              onValueChange={handleNoticeTypeChange}
              placeholder={t('type', 'Type')}
              inline={false}
            />
          </View>
        ) : !hideStatusFilter ? (
          <View className="flex-1 min-w-[90px]">
            <DropdownSelect
              options={[
                { label: t('all_statuses', 'All Statuses'), value: '' },
                ...Object.values(STATUSES).map((st) => ({ label: t(`status_${st.toLowerCase()}`, st), value: st })),
              ]}
              value={filters?.status || ''}
              onValueChange={(val) => onFiltersChange({ status: val })}
              placeholder={t('status', 'Status')}
              inline={false}
            />
          </View>
        ) : null}

        {/* Sort By Filter */}
        <View className="flex-1 min-w-[90px]">
          <DropdownSelect
            options={SORT_OPTIONS.map(opt => ({ ...opt, label: t(opt.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'), opt.label) }))}
            value={activeSortOption}
            onValueChange={handleSortSelect}
            placeholder={t('sort', 'Sort')}
            inline={false}
          />
        </View>
      </View>
    </View>
  );
};

export default NoticeBoardFilters;
