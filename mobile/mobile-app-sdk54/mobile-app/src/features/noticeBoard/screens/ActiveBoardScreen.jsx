import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/common/Badge';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { useNoticeSocket } from '../hooks/useNoticeSocket';
import { 
  MemoizedNoticeCard, 
  ErrorBoundary, 
  NoticeBoardFilters, 
  NoticeBoardEmptyState,
  NoticeBoardLoadingSkeleton
} from '../components';
import { debounce } from '../utils/debounce';
import { Heart, Share2, AlertTriangle, Bookmark, BarChart2 } from 'lucide-react-native';



export default function ActiveBoardScreen() {
  const router = useRouter();
  const { openNoticeId } = useLocalSearchParams();

  // Real-time socket sync
  useNoticeSocket();

  const {
    notices,
    selectedNotice,
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
  } = useNoticeBoard();

  const [localSearch, setLocalSearch] = useState(search);
  const [activeTab, setActiveTab] = useState('All');

  // Initialize board and apply default Published status filter on mount
  useEffect(() => {
    setFilters({ status: 'Published' });
    loadNotices();
    loadNoticeStats?.(); // optionally fetch stats for resident
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
    setFilters({ status: 'Published' }); // Default active state
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

  const getCategoryThemeColor = (category) => {
    switch (category) {
      case 'Emergency': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Maintenance': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'Events': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Meetings': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

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
        title="Notice Board" 
        loading={loading && notices.length === 0}
      >
        <View className="flex-1 bg-background">
          {/* Web-Style Unified Filters */}
          <View className="px-4 py-3 border-b border-border/40 bg-card z-10" style={{ zIndex: 50 }}>
            <NoticeBoardFilters
              search={localSearch || ''}
              filters={filters}
              sort={sort}
              onSearchChange={handleSearchChange}
              onFiltersChange={handleFiltersChange}
              onSortChange={setSort}
              onReset={handleResetFilters}
              hideStatusFilter={true} // Active board only shows Published notices
              showNoticeTypeFilter={true}
            />
          </View>

          {/* Notice Board List */}
          <View className="flex-1">
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
                }}
                emptyComponent={<NoticeBoardEmptyState />}
                contentContainerClassName="py-4 pb-8"
              />
            )}
          </View>
        </View>
      </ScreenShell>
    </ErrorBoundary>
  );
}
