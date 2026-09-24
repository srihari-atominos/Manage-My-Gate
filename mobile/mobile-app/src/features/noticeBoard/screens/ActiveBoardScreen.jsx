import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar, SortOption } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/common/Chip';
import { useTranslation } from '@/src/utils/i18n';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { useNoticeSocket } from '../hooks/useNoticeSocket';
import {
  NoticePostCard,
  PollPostCard,
  ActiveBoardFilterDrawer,
  DEFAULT_ACTIVE_BOARD_FILTERS,
  ErrorBoundary,
  NoticeBoardLoadingSkeleton,
} from '../components';
import { pollApi } from '@/src/features/poll/services/pollApi';
import { debounce } from '../utils/debounce';
import {
  Megaphone,
  BarChart3,
  Layers,
  RotateCcw,
} from 'lucide-react-native';

import { usePolls } from '@/src/features/poll/hooks/usePolls.js';

export default function ActiveBoardScreen() {
  const router = useRouter();
  const { openNoticeId } = useLocalSearchParams();
  const { t, language } = useTranslation();
  const { selectCurrentPoll } = usePolls();

  // Real-time socket sync
  useNoticeSocket();

  const {
    notices,
    loading,
    pagination,
    search,
    filters,
    sort,
    loadNotices,
    setSearch,
    setFilters,
    setCurrentPage,
    selectNotice,
    readNotice,
    toggleBookmark,
    acknowledgeNotice,
    canManage,
    isAdmin,
  } = useNoticeBoard();

  // Perspective mode: 'ALL' | 'NOTICES' | 'POLLS'
  const [perspectiveMode, setPerspectiveMode] = useState('ALL');

  // Quick pill filter: 'ALL' | 'URGENT' | 'PINNED' | 'SIGNOFF' | 'Maintenance' | 'Events' | 'General' | 'Meetings'
  const [activeQuickPill, setActiveQuickPill] = useState('ALL');

  // Local debounced search
  const [localSearch, setLocalSearch] = useState(search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search || '');

  // Advanced Filter Drawer state
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_ACTIVE_BOARD_FILTERS);

  // Polls dataset
  const [polls, setPolls] = useState([]);
  const [pollsLoading, setPollsLoading] = useState(false);

  // Fetch active polls
  const fetchActivePolls = useCallback(async () => {
    try {
      setPollsLoading(true);
      const res = await pollApi.getPolls({ status: 'Active', limit: 20 });
      const raw = res?.data?.data?.polls || res?.data?.data || res?.data?.polls || res?.data || [];
      setPolls(Array.isArray(raw) ? raw : []);
    } catch {
      setPolls([]);
    } finally {
      setPollsLoading(false);
    }
  }, []);

  // Initialize board and apply default Published status on mount & focus
  useFocusEffect(
    useCallback(() => {
      setFilters({ status: 'Published' });
      loadNotices();
      fetchActivePolls();
    }, [setFilters, loadNotices, fetchActivePolls])
  );

  // Deep-linking to automatically open notice details
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
  }, [openNoticeId, notices, selectNotice, readNotice, router]);

  // Debounced search updates
  const debouncedSearchUpdate = useMemo(
    () =>
      debounce((val) => {
        setDebouncedSearch(val);
        setSearch(val);
      }, 300),
    [setSearch]
  );

  const handleSearchChange = useCallback(
    (value) => {
      setLocalSearch(value);
      debouncedSearchUpdate(value);
    },
    [debouncedSearchUpdate]
  );

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    loadNotices();
    fetchActivePolls();
  }, [loadNotices, fetchActivePolls, setCurrentPage]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages && !loading) {
      setCurrentPage(pagination.currentPage + 1);
    }
  }, [pagination, loading, setCurrentPage]);

  const handleCardPress = useCallback(
    (notice) => {
      selectNotice(notice);
      if (!notice.isReadByUser) {
        readNotice(notice._id);
      }
      router.push({
        pathname: '/(resident)/notices/[id]',
        params: { id: notice._id },
      });
    },
    [selectNotice, readNotice, router]
  );

  const handlePollPress = useCallback(
    (poll) => {
      if (poll) {
        selectCurrentPoll(poll);
      }
      router.push({
        pathname: '/(resident)/polls/[id]',
        params: { id: poll._id || poll.id },
      });
    },
    [router, selectCurrentPoll]
  );

  const handleBookmarkPress = useCallback(
    (id, isBookmarked) => {
      toggleBookmark(id, isBookmarked);
    },
    [toggleBookmark]
  );

  const handleAcknowledgePress = useCallback(
    async (id) => {
      try {
        await acknowledgeNotice(id, '');
        handleRefresh();
      } catch {
        router.push({
          pathname: '/(resident)/notices/[id]',
          params: { id },
        });
      }
    },
    [acknowledgeNotice, handleRefresh, router]
  );

  // Combine raw notices & active polls based on perspective mode
  const combinedItems = useMemo(() => {
    const rawNotices = (notices || []).map((n) => ({ ...n, itemType: 'NOTICE' }));
    const rawPolls = (polls || []).map((p) => ({ ...p, itemType: 'POLL' }));

    if (perspectiveMode === 'NOTICES') return rawNotices;
    if (perspectiveMode === 'POLLS') return rawPolls;

    return [...rawNotices, ...rawPolls].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [perspectiveMode, notices, polls]);

  // Live item count calculations for quick pill badges
  const liveCounts = useMemo(() => {
    let all = 0;
    let urgent = 0;
    let pinned = 0;
    let signoff = 0;
    let maintenance = 0;
    let events = 0;
    let general = 0;
    let meetings = 0;

    (notices || []).forEach((n) => {
      all++;
      const isUrgent = n.priority === 'High' || n.priority === 'Critical' || n.isCritical;
      if (isUrgent) urgent++;
      if (n.isPinned) pinned++;
      if (n.requiresAcknowledgement && !n.hasAcknowledged) signoff++;
      if (n.category === 'Maintenance') maintenance++;
      if (n.category === 'Events') events++;
      if (n.category === 'General') general++;
      if (n.category === 'Meetings') meetings++;
    });

    return { all, urgent, pinned, signoff, maintenance, events, general, meetings };
  }, [notices]);

  // Quick pill options for the horizontal scroll bar in SearchFilterBar
  const quickPillOptions = useMemo(
    () => [
      { label: `All (${liveCounts.all})`, value: 'ALL' },
      { label: `🚨 Urgent (${liveCounts.urgent})`, value: 'URGENT' },
      { label: `📌 Pinned (${liveCounts.pinned})`, value: 'PINNED' },
      { label: `✍️ Needs Sign-off (${liveCounts.signoff})`, value: 'SIGNOFF' },
      { label: `🛠️ Maintenance (${liveCounts.maintenance})`, value: 'Maintenance' },
      { label: `🎉 Events (${liveCounts.events})`, value: 'Events' },
      { label: `📢 General (${liveCounts.general})`, value: 'General' },
      { label: `🏛️ Meetings (${liveCounts.meetings})`, value: 'Meetings' },
    ],
    [liveCounts]
  );

  // Apply Quick Pill, Search, and Advanced Drawer Filters
  const filteredFeedItems = useMemo(() => {
    return combinedItems.filter((item) => {
      // If it's a poll, only filter by search keyword unless in poll mode
      if (item.itemType === 'POLL') {
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          const match =
            item.question?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      }

      // 1. Quick Pill Filter
      if (activeQuickPill === 'URGENT') {
        const isUrgent =
          item.priority === 'High' || item.priority === 'Critical' || item.isCritical;
        if (!isUrgent) return false;
      } else if (activeQuickPill === 'PINNED') {
        if (!item.isPinned) return false;
      } else if (activeQuickPill === 'SIGNOFF') {
        if (!item.requiresAcknowledgement || item.hasAcknowledged) return false;
      } else if (activeQuickPill !== 'ALL') {
        if (item.category !== activeQuickPill) return false;
      }

      // 2. Debounced Search Keyword Filter
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchCat = item.category?.toLowerCase().includes(q);
        const matchAuthor =
          item.author?.name?.toLowerCase().includes(q) ||
          item.createdBy?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat && !matchAuthor) return false;
      }

      // 3. Advanced Drawer Filters
      if (activeFilters.categories.length > 0) {
        if (!activeFilters.categories.includes(item.category)) return false;
      }

      if (activeFilters.priorities.length > 0) {
        if (!activeFilters.priorities.includes(item.priority)) return false;
      }

      if (activeFilters.requiresSignoffOnly) {
        if (!item.requiresAcknowledgement || item.hasAcknowledged) return false;
      }

      if (activeFilters.unreadOnly) {
        if (item.isReadByUser) return false;
      }

      if (activeFilters.isPinnedOnly) {
        if (!item.isPinned) return false;
      }

      if (activeFilters.hasImagesOnly) {
        if (!item.images || item.images.length === 0) return false;
      }

      if (activeFilters.hasDocsOnly) {
        if (!item.attachments || item.attachments.length === 0) return false;
      }

      // Date range filter
      if (activeFilters.datePreset !== 'ALL_TIME') {
        const itemDate = new Date(item.createdAt).getTime();
        const now = new Date().getTime();
        if (activeFilters.datePreset === 'TODAY') {
          const oneDayMs = 24 * 60 * 60 * 1000;
          if (now - itemDate > oneDayMs) return false;
        } else if (activeFilters.datePreset === 'THIS_WEEK') {
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          if (now - itemDate > sevenDaysMs) return false;
        } else if (activeFilters.datePreset === 'PAST_30_DAYS') {
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          if (now - itemDate > thirtyDaysMs) return false;
        }
      }

      return true;
    });
  }, [combinedItems, activeQuickPill, debouncedSearch, activeFilters]);

  // Active filter count badge for drawer button
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.categories?.length > 0) count++;
    if (activeFilters.priorities?.length > 0) count++;
    if (activeFilters.requiresSignoffOnly) count++;
    if (activeFilters.unreadOnly) count++;
    if (activeFilters.isPinnedOnly) count++;
    if (activeFilters.hasImagesOnly) count++;
    if (activeFilters.hasDocsOnly) count++;
    if (activeFilters.datePreset !== 'ALL_TIME') count++;
    return count;
  }, [activeFilters]);

  const isFilterActive =
    activeQuickPill !== 'ALL' ||
    Boolean(debouncedSearch) ||
    activeFilterCount > 0 ||
    perspectiveMode !== 'ALL';

  const handleResetAllFilters = useCallback(() => {
    setActiveQuickPill('ALL');
    setLocalSearch('');
    setDebouncedSearch('');
    setSearch('');
    setActiveFilters(DEFAULT_ACTIVE_BOARD_FILTERS);
    setPerspectiveMode('ALL');
  }, [setSearch]);

  const renderHeader = () => (
    <View className="mb-2 gap-2.5">
      {/* Layer 1: Perspective Mode Toggle (All Active / Notices / Polls) */}
      <View className="flex-row items-center gap-2 pt-1 pb-0.5">
        <Chip
          label={`All Active (${(notices?.length || 0) + (polls?.length || 0)})`}
          icon={Layers}
          selected={perspectiveMode === 'ALL'}
          onPress={() => setPerspectiveMode('ALL')}
          className="rounded-full px-3 py-1.5"
        />
        <Chip
          label={`Announcements (${notices?.length || 0})`}
          icon={Megaphone}
          selected={perspectiveMode === 'NOTICES'}
          onPress={() => setPerspectiveMode('NOTICES')}
          className="rounded-full px-3 py-1.5"
        />
        <Chip
          label={`Live Polls (${polls?.length || 0})`}
          icon={BarChart3}
          selected={perspectiveMode === 'POLLS'}
          onPress={() => setPerspectiveMode('POLLS')}
          className="rounded-full px-3 py-1.5"
        />
      </View>

      {/* Layer 2: Search Input & Advanced Drawer Trigger */}
      {/* Layer 3: Horizontal Scrollable Quick Pills with Live Counts */}
      <SearchFilterBar
        searchValue={localSearch}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('search_notices', 'Search announcements, updates, keywords...')}
        sortOptions={quickPillOptions}
        currentSort={activeQuickPill}
        onSortChange={setActiveQuickPill}
        onFilterPress={() => setFilterDrawerVisible(true)}
        activeFilterCount={activeFilterCount}
        className="px-0 py-0 border-0"
      />
    </View>
  );

  const renderFeedItem = useCallback(
    (item) => {
      if (item.itemType === 'POLL' || (!item.category && item.question)) {
        return (
          <PollPostCard
            key={`poll-${item._id || item.id}`}
            poll={item}
            onPress={handlePollPress}
          />
        );
      }

      return (
        <NoticePostCard
          key={`notice-${item._id || item.id}`}
          notice={item}
          onPress={handleCardPress}
          onBookmarkToggle={handleBookmarkPress}
          onAcknowledge={handleAcknowledgePress}
          isAdmin={isAdmin}
        />
      );
    },
    [handleCardPress, handlePollPress, handleBookmarkPress, handleAcknowledgePress, isAdmin]
  );

  const isLoadingInitial = loading && notices.length === 0;

  return (
    <ErrorBoundary>
      <ScreenShell
        title={t('notice_board', 'Notice Board')}
        subtitle={t('official_announcements', 'Live community announcements & resident votes')}
        iconName="Megaphone"
        loading={false}
        headerRight={
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
        }
      >
        <View className="flex-1 bg-background">
          {isLoadingInitial ? (
            <View className="p-4">
              <NoticeBoardLoadingSkeleton />
            </View>
          ) : (
            <PaginatedList
              data={filteredFeedItems}
              extraData={language}
              renderItem={renderFeedItem}
              keyExtractor={(item) =>
                item.itemType === 'POLL'
                  ? `poll-${item._id || item.id}-${language}`
                  : `notice-${item._id || item.id}-${language}`
              }
              loading={loading || pollsLoading}
              onRefresh={handleRefresh}
              onLoadMore={handleLoadMore}
              pagination={{
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                totalRecords: filteredFeedItems.length,
                limit: pagination.limit || 10,
              }}
              emptyIcon="Megaphone"
              emptyTitle={
                isFilterActive
                  ? t('no_matching_notices', 'No Matching Announcements')
                  : t('no_notices', 'No Active Announcements')
              }
              emptySubtitle={
                isFilterActive
                  ? t(
                      'try_adjusting_filters',
                      'No announcements match the selected filter criteria. Tap below to reset.'
                    )
                  : t(
                      'check_back_later',
                      'There are currently no active community announcements or live ballots.'
                    )
              }
              emptyAction={
                isFilterActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleResetAllFilters}
                    className="mt-2 rounded-xl"
                  >
                    <Text className="text-xs font-semibold text-foreground">
                      Reset All Filters
                    </Text>
                  </Button>
                ) : undefined
              }
              ListHeaderComponent={renderHeader()}
              contentContainerClassName="px-4 pt-2 pb-36 gap-3"
              contentContainerStyle={{ paddingBottom: 110 }}
            />
          )}
        </View>

        {/* Advanced Filter Sliding Drawer */}
        <ActiveBoardFilterDrawer
          visible={filterDrawerVisible}
          onClose={() => setFilterDrawerVisible(false)}
          filters={activeFilters}
          onApply={setActiveFilters}
          onReset={() => setActiveFilters(DEFAULT_ACTIVE_BOARD_FILTERS)}
          matchCount={filteredFeedItems.length}
        />
      </ScreenShell>
    </ErrorBoundary>
  );
}
