import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useTranslation } from '@/src/utils/i18n';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { useNoticeSocket } from '../hooks/useNoticeSocket';
import { 
  MemoizedNoticeCard, 
  ErrorBoundary, 
  NoticeBoardFilters, 
  NoticeBoardLoadingSkeleton
} from '../components';
import { debounce } from '../utils/debounce';
import { AlertTriangle } from 'lucide-react-native';

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
  } = useNoticeBoard();

  const [localSearch, setLocalSearch] = useState(search);

  // Initialize board and apply default Published status filter on mount
  useEffect(() => {
    setFilters({ status: 'Published' });
    loadNotices();
    loadNoticeStats?.();
  }, []);

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
    setLocalSearch(search);
  }, [search]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    loadNotices();
  }, [loadNotices, setCurrentPage]);

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

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters({ ...filters, ...newFilters });
  }, [filters, setFilters]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setFilters({ status: 'Published' });
    setSearch('');
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

  const renderNoticeItem = useCallback((notice) => (
    <MemoizedNoticeCard
      notice={notice}
      onPress={handleCardPress}
      onBookmarkToggle={handleBookmarkPress}
    />
  ), [handleCardPress, handleBookmarkPress]);

  return (
    <ErrorBoundary>
      <ScreenShell 
        title={t('notice_board', 'Notice Board')}
        subtitle={t('official_announcements', 'Community updates & announcements')}
        iconName="Megaphone"
        loading={false}
      >
        <View className="flex-1 bg-background">
          <View className="px-4 pt-3 pb-2 border-b border-border/40 bg-card z-50" style={{ zIndex: 50 }}>
            <NoticeBoardFilters
              search={localSearch || ''}
              filters={filters}
              sort={sort}
              onSearchChange={handleSearchChange}
              onFiltersChange={handleFiltersChange}
              onSortChange={setSort}
              onReset={handleResetFilters}
              hideStatusFilter={true}
              showNoticeTypeFilter={true}
            />
          </View>

          <View className="flex-1 z-0">
            {loading && notices.length === 0 ? (
              <NoticeBoardLoadingSkeleton />
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
              emptySubtitle={t('check_back_later', 'Check back later for community updates and announcements.')}
              contentContainerClassName="px-4 pt-3 pb-28"
            />
          )}
          </View>
        </View>
      </ScreenShell>
    </ErrorBoundary>
  );
}
