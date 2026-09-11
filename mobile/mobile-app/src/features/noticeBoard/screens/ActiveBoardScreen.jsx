import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { ActionGrid } from '@/components/ui/ActionGrid';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/src/utils/i18n';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { useNoticeSocket } from '../hooks/useNoticeSocket';
import { 
  MemoizedNoticeCard, 
  ErrorBoundary, 
  NoticeBoardTopNav,
  NoticeBoardLoadingSkeleton,
} from '../components';
import { debounce } from '../utils/debounce';
import { 
  Megaphone, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Heart, 
  CheckSquare, 
  ListChecks, 
  RotateCcw,
  Wrench,
  Calendar,
  Building2,
} from 'lucide-react-native';

const CATEGORY_FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'General', value: 'General', icon: Megaphone },
  { label: 'Maintenance', value: 'Maintenance', icon: Wrench },
  { label: 'Events', value: 'Events', icon: Calendar },
  { label: 'Emergency', value: 'Emergency', icon: ShieldAlert },
  { label: 'Meetings', value: 'Meetings', icon: Building2 },
];

const PRIORITY_FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
];

const TYPE_FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Unread', value: 'Unread' },
  { label: 'Bookmarks', value: 'Bookmarks' },
];

export default function ActiveBoardScreen() {
  const router = useRouter();
  const { openNoticeId } = useLocalSearchParams();
  const { t } = useTranslation();

  // Real-time socket sync
  useNoticeSocket();

  const {
    notices,
    loading,
    pagination,
    search,
    filters,
    sort,
    dashboardStats,
    loadNotices,
    loadNoticeStats,
    setSearch,
    setFilters,
    setSort,
    resetFilters,
    setCurrentPage,
    selectNotice,
    readNotice,
    toggleBookmark,
    canManage,
    isAdmin,
  } = useNoticeBoard();

  const [filterType, setFilterType] = useState('CATEGORY'); // 'CATEGORY' | 'PRIORITY' | 'TYPE'
  const [localSearch, setLocalSearch] = useState(search || '');

  // Initialize board and apply default Published status filter on mount & focus
  useFocusEffect(
    useCallback(() => {
      setFilters({ status: 'Published' });
      loadNotices();
      loadNoticeStats?.();
    }, [setFilters, loadNotices, loadNoticeStats])
  );

  // Handle deep-linking to automatically open notice details
  useEffect(() => {
    if (openNoticeId && notices.length > 0) {
      const notice = notices.find((n) => n._id === openNoticeId);
      if (notice) {
        selectNotice(notice);
        if (!notice.isReadByUser) {
          readNotice(notice._id);
        }
        router.push({
          pathname: '/(resident)/notices/[id]',
          params: { id: notice._id },
        });
      }
    }
  }, [openNoticeId, notices, router]);

  // Load notices when search, filters, sorting or page changes
  useEffect(() => {
    loadNotices();
  }, [search, filters, sort, pagination.currentPage]);

  // Sync local search input if search is reset globally
  useEffect(() => {
    setLocalSearch(search || '');
  }, [search]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    loadNotices();
    loadNoticeStats?.();
  }, [loadNotices, loadNoticeStats, setCurrentPage]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages && !loading) {
      setCurrentPage(pagination.currentPage + 1);
    }
  }, [pagination, loading, setCurrentPage]);

  // Debounced search updates to Redux store
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setSearch(value);
    }, 300),
    [setSearch]
  );

  const handleSearchChange = useCallback((value) => {
    setLocalSearch(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  const handleCategoryFilterChange = useCallback((categoryValue) => {
    setCurrentPage(1);
    const newFilters = { ...filters };
    if (categoryValue === 'ALL' || !categoryValue) {
      delete newFilters.category;
    } else {
      newFilters.category = categoryValue;
    }
    setFilters(newFilters);
  }, [filters, setFilters, setCurrentPage]);

  const handlePriorityFilterChange = useCallback((priorityValue) => {
    setCurrentPage(1);
    const newFilters = { ...filters };
    if (priorityValue === 'ALL' || !priorityValue) {
      delete newFilters.priority;
    } else {
      newFilters.priority = priorityValue;
    }
    setFilters(newFilters);
  }, [filters, setFilters, setCurrentPage]);

  const handleTypeFilterChange = useCallback((typeValue) => {
    setCurrentPage(1);
    const newFilters = { ...filters };
    if (typeValue === 'Unread') {
      newFilters.readStatus = 'Unread';
      delete newFilters.isBookmarked;
    } else if (typeValue === 'Bookmarks') {
      newFilters.isBookmarked = 'true';
      delete newFilters.readStatus;
    } else {
      delete newFilters.readStatus;
      delete newFilters.isBookmarked;
    }
    setFilters(newFilters);
  }, [filters, setFilters, setCurrentPage]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setFilters({ status: 'Published' });
    setSearch('');
    setLocalSearch('');
    setSort({ sortBy: 'createdAt', sortOrder: 'desc' });
  }, [resetFilters, setFilters, setSearch, setSort]);

  const handleCardPress = useCallback((notice) => {
    router.push({
      pathname: '/(resident)/notices/[id]',
      params: { id: notice._id },
    });
  }, [router]);

  const handleBookmarkPress = useCallback((id, isBookmarked) => {
    toggleBookmark(id, isBookmarked);
  }, [toggleBookmark]);

  // Derive counts for Visitor-Management style KPI cards
  const stats = dashboardStats?.kpis || {};
  const activeCount = stats.activeNotices || (notices.filter(n => n.status === 'Published').length || notices.length);
  const highPriorityCount = notices.filter(n => n.priority === 'High').length;
  const unreadCount = notices.filter(n => !n.isReadByUser).length;
  const bookmarkedCount = notices.filter(n => n.isBookmarkedByUser).length;

  const isHighPriorityFilter = filters?.priority === 'High';
  const isBookmarkFilter = filters?.isBookmarked === 'true' || filters?.isBookmarked === true;
  const isCategoryFilter = !!filters?.category;
  const isSearchFilter = !!search;
  const isFilterActive = isHighPriorityFilter || isBookmarkFilter || isCategoryFilter || isSearchFilter;

  // Visitor-style KPI cards
  const noticeKpis = useMemo(() => [
    {
      title: t('active_notices', 'Active Notices'),
      value: String(activeCount),
      iconName: 'Megaphone',
      variant: 'success',
      trend: { direction: 'up', value: t('live', 'Live') },
    },
    {
      title: t('high_priority', 'High Priority'),
      value: String(highPriorityCount),
      iconName: 'AlertTriangle',
      variant: highPriorityCount > 0 ? 'warning' : 'default',
      trend: {
        direction: highPriorityCount > 0 ? 'up' : 'down',
        value: highPriorityCount > 0 ? t('needs_attention', 'Important') : t('clear', 'Normal'),
      },
    },
    {
      title: t('unread_notices', 'Unread'),
      value: String(unreadCount),
      iconName: 'CheckCircle',
      variant: unreadCount > 0 ? 'warning' : 'default',
      trend: {
        direction: 'up',
        value: unreadCount > 0 ? t('pending', 'Pending') : t('up_to_date', 'Up to date'),
      },
    },
  ], [activeCount, highPriorityCount, unreadCount, t]);

  // Visitor-style 3-Column ActionGrid items
  const noticeActions = useMemo(() => [
    {
      id: 'high_priority',
      name: isHighPriorityFilter ? t('all_notices', 'All Notices') : t('high_priority', 'High Priority'),
      iconName: 'AlertTriangle',
      colorBg: isHighPriorityFilter ? 'bg-amber-500/20' : 'bg-amber-500/10',
      colorIcon: '#f59e0b',
      badge: highPriorityCount > 0 ? highPriorityCount : undefined,
      badgeColor: 'bg-amber-600',
      onPress: () => {
        setFilterType('PRIORITY');
        if (isHighPriorityFilter) {
          const newFilters = { ...filters };
          delete newFilters.priority;
          setFilters(newFilters);
        } else {
          setFilters({ ...filters, priority: 'High', isBookmarked: undefined, readStatus: undefined });
        }
      },
    },
    {
      id: 'polls',
      name: t('polls_surveys', 'Polls & Votes'),
      iconName: 'CheckSquare',
      colorBg: 'bg-purple-500/10',
      colorIcon: '#8b5cf6',
      route: '/(resident)/polls',
    },
    {
      id: 'bookmarks',
      name: isBookmarkFilter ? t('all_notices', 'All Notices') : t('saved_bookmarks', 'Bookmarks'),
      iconName: 'Heart',
      colorBg: isBookmarkFilter ? 'bg-amber-500/20' : 'bg-amber-500/10',
      colorIcon: '#f59e0b',
      badge: bookmarkedCount > 0 ? bookmarkedCount : undefined,
      badgeColor: 'bg-amber-500',
      onPress: () => {
        setFilterType('TYPE');
        if (isBookmarkFilter) {
          const newFilters = { ...filters };
          delete newFilters.isBookmarked;
          setFilters(newFilters);
        } else {
          setFilters({ ...filters, isBookmarked: 'true', readStatus: undefined });
        }
      },
    },
  ], [isHighPriorityFilter, isBookmarkFilter, highPriorityCount, bookmarkedCount, filters, setFilters, t]);

  const currentFilterValue = useMemo(() => {
    if (filterType === 'CATEGORY') return filters.category || 'ALL';
    if (filterType === 'PRIORITY') return filters.priority || 'ALL';
    if (filterType === 'TYPE') {
      if (filters.isBookmarked === 'true' || filters.isBookmarked === true) return 'Bookmarks';
      if (filters.readStatus === 'Unread') return 'Unread';
      return 'ALL';
    }
    return 'ALL';
  }, [filterType, filters]);

  const renderNoticeItem = useCallback((notice) => (
    <MemoizedNoticeCard
      notice={notice}
      onPress={handleCardPress}
      onBookmarkToggle={handleBookmarkPress}
      isAdmin={isAdmin}
    />
  ), [handleCardPress, handleBookmarkPress, isAdmin]);

  const listHeaderComponent = useMemo(() => (
    <View className="gap-3 mb-1">
      {/* Management Navigation Tabs (Admins/Managers only) */}
      {(canManage || isAdmin) && <NoticeBoardTopNav />}

      {/* Universal KPI Statistics Strip (Visitor Management Standard) */}
      <KPIDashboardStrip cards={noticeKpis} />

      {/* Universal 3-Column ActionGrid (Urgent, Polls, Bookmarks) */}
      <ActionGrid title={t('quick_actions', 'Quick Actions')} items={noticeActions} />

      {/* Filter Mode Switcher matching Manage Notices (Category vs Priority vs Type) */}
      <View className="flex-row items-center justify-between px-1 mt-1">
        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t('filter_by', 'Filter by:')}
        </Text>
        <View className="flex-row bg-muted/60 p-0.5 rounded-xl gap-1">
          <TouchableOpacity
            onPress={() => setFilterType('CATEGORY')}
            className={`px-2.5 py-1 rounded-lg ${filterType === 'CATEGORY' ? 'bg-card shadow-xs' : 'bg-transparent'}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: filterType === 'CATEGORY' }}
          >
            <Text className={`text-xs font-bold ${filterType === 'CATEGORY' ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('category', 'Category')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterType('PRIORITY')}
            className={`px-2.5 py-1 rounded-lg ${filterType === 'PRIORITY' ? 'bg-card shadow-xs' : 'bg-transparent'}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: filterType === 'PRIORITY' }}
          >
            <Text className={`text-xs font-bold ${filterType === 'PRIORITY' ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('priority', 'Priority')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterType('TYPE')}
            className={`px-2.5 py-1 rounded-lg ${filterType === 'TYPE' ? 'bg-card shadow-xs' : 'bg-transparent'}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: filterType === 'TYPE' }}
          >
            <Text className={`text-xs font-bold ${filterType === 'TYPE' ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('type', 'Type')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filter Bar with Dynamic Category, Priority, or Type Pills matching Manage Notices Screen */}
      <SearchFilterBar
        searchValue={localSearch}
        onSearchChange={handleSearchChange}
        searchPlaceholder={
          filterType === 'CATEGORY'
            ? t('search_by_category', 'Search notices by category, title...')
            : filterType === 'PRIORITY'
            ? t('search_by_priority', 'Search notices by priority, title...')
            : t('search_notices', 'Search announcements...')
        }
        sortOptions={
          filterType === 'CATEGORY'
            ? CATEGORY_FILTER_OPTIONS
            : filterType === 'PRIORITY'
            ? PRIORITY_FILTER_OPTIONS
            : TYPE_FILTER_OPTIONS
        }
        currentSort={currentFilterValue}
        onSortChange={
          filterType === 'CATEGORY'
            ? handleCategoryFilterChange
            : filterType === 'PRIORITY'
            ? handlePriorityFilterChange
            : handleTypeFilterChange
        }
        variant="default"
        className="px-0 py-0 border-0"
      />

      {/* Canonical Section Header */}
      <SectionHeader
        title={
          isHighPriorityFilter
            ? t('high_priority', 'High Priority')
            : isBookmarkFilter
            ? t('saved_bookmarks', 'Saved Bookmarks')
            : filters?.category
            ? `${filters.category} ${t('notices', 'Notices')}`
            : t('recent_announcements', 'Recent Announcements')
        }
        actionLabel={isFilterActive ? t('view_all', 'View All') : undefined}
        onAction={isFilterActive ? handleResetFilters : undefined}
        className="px-0 bg-transparent dark:bg-transparent"
      />
    </View>
  ), [
    canManage,
    isAdmin,
    noticeKpis,
    noticeActions,
    filterType,
    localSearch,
    handleSearchChange,
    currentFilterValue,
    handleCategoryFilterChange,
    handlePriorityFilterChange,
    handleTypeFilterChange,
    isHighPriorityFilter,
    isBookmarkFilter,
    filters?.category,
    isFilterActive,
    handleResetFilters,
    t,
  ]);

  const isLoadingInitial = loading && notices.length === 0;

  return (
    <ErrorBoundary>
      <ScreenShell 
        title={t('notice_board', 'Notice Board')}
        subtitle={t('official_announcements', 'Community announcements & resident polls')}
        iconName="Megaphone"
        loading={false}
        headerRight={
          (canManage || isAdmin) ? (
            <Button
              variant="outline"
              size="sm"
              onPress={() => router.push('/(resident)/notices/manage')}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
              accessibilityRole="button"
              accessibilityLabel="Manage Notices"
            >
              <ListChecks size={13} className="text-foreground" />
              <Text className="text-xs font-semibold text-foreground">{t('manage', 'Manage')}</Text>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onPress={handleRefresh}
              className="w-9 h-9 rounded-full items-center justify-center p-0"
              accessibilityRole="button"
              accessibilityLabel="Refresh notices"
            >
              <RotateCcw size={16} className="text-foreground" />
            </Button>
          )
        }
      >
        <View className="flex-1 bg-background">
          {isLoadingInitial ? (
            <View className="p-4">
              <NoticeBoardLoadingSkeleton />
            </View>
          ) : (
            <PaginatedList
              data={notices}
              renderItem={renderNoticeItem}
              keyExtractor={(item) => item._id}
              loading={loading}
              onRefresh={handleRefresh}
              onLoadMore={handleLoadMore}
              pagination={{
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                totalRecords: pagination.totalRecords || notices.length,
                limit: pagination.limit || 10,
              }}
              emptyIcon="Megaphone"
              emptyTitle={t('no_notices', 'No Notices Available')}
              emptySubtitle={
                isFilterActive
                  ? t('no_matching_notices', 'No notices match the selected filters. Tap View All to reset.')
                  : t('check_back_later', 'Check back later for community updates and announcements.')
              }
              ListHeaderComponent={listHeaderComponent}
              contentContainerClassName="p-4 pb-36 gap-3"
            />
          )}
        </View>
      </ScreenShell>
    </ErrorBoundary>
  );
}
