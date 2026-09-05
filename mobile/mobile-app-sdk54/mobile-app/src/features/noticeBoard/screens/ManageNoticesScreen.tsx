import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { KPIRow } from '@/components/ui/KPIRow';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Text } from '@/components/ui/text';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { useNoticeSocket } from '../hooks/useNoticeSocket';
import {
  NoticeCard,
  ErrorBoundary,
  NoticeManagementFilterBar,
  NoticeBoardLoadingSkeleton,
} from '../components';
import { debounce } from '../utils/debounce';
import { NoticeItem } from '../components/NoticeCard';

function ManageNoticesContent() {
  const router = useRouter();

  // Connect to real-time events
  useNoticeSocket();

  const {
    notices,
    loading,
    error,
    pagination,
    search,
    filters,
    activeKpiCard,
    sort,
    dashboardStats,
    dashboardLoading,
    loadNotices,
    setSearch,
    setFilters,
    setActiveKpiCard,
    setSort,
    resetFilters,
    setCurrentPage,
    removeNotice,
    changePinStatus,
    modifyNotice,
    loadNoticeStats,
    canCreate,
    canUpdate,
    canDelete,
    canPin,
  } = useNoticeBoard();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState<string>(search || '');

  // Initialize data on mount
  useEffect(() => {
    loadNotices();
    loadNoticeStats();
  }, []);

  // Sync notice listings on state modifications
  useEffect(() => {
    loadNotices();
  }, [search, filters, sort, pagination.currentPage, activeKpiCard]);

  // Sync local search when search resets
  useEffect(() => {
    setLocalSearch(search || '');
  }, [search]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    loadNotices();
    loadNoticeStats();
  }, [loadNotices, loadNoticeStats, setCurrentPage]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages && !loading) {
      setCurrentPage(pagination.currentPage + 1);
    }
  }, [pagination, loading, setCurrentPage]);

  // Debounced search updates to Redux
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
    }, 300),
    [setSearch]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirmId) {
      await removeNotice(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, removeNotice]);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      const formData = new FormData();
      formData.append('status', newStatus);
      await modifyNotice(id, formData);
    },
    [modifyNotice]
  );

  const handlePinToggle = useCallback(
    async (id: string, currentPinState: boolean) => {
      await changePinStatus(id, !currentPinState);
    },
    [changePinStatus]
  );

  const handleEditPress = useCallback(
    (notice: NoticeItem) => {
      router.push({
        pathname: '/(resident)/notices/create' as any,
        params: { id: notice._id || notice.id },
      });
    },
    [router]
  );

  const handleCardPress = useCallback(
    (notice: NoticeItem) => {
      router.push({
        pathname: '/(resident)/notices/[id]' as any,
        params: { id: notice._id },
      });
    },
    [router]
  );

  const handleDeletePress = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const renderNoticeItem = useCallback(
    (notice: NoticeItem) => (
      <NoticeCard
        notice={notice}
        onPress={handleCardPress}
        onPinToggle={handlePinToggle}
        onStatusChange={handleStatusChange}
        onEditPress={handleEditPress}
        onDeletePress={handleDeletePress}
        isAdmin={true}
        canPin={canPin}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    ),
    [handleCardPress, handlePinToggle, handleStatusChange, handleEditPress, handleDeletePress, canPin, canUpdate, canDelete]
  );

  const stats = dashboardStats?.kpis || {};

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Admin KPI Stats Dashboard */}
      <KPIRow
        cards={[
          {
            title: 'Active Notices',
            value: String(stats.activeNotices || 0),
            subtitle: 'Published Live',
            iconName: 'CheckCircle2',
            variant: 'success',
            onPress: () => setActiveKpiCard(activeKpiCard === 'Published' ? null : 'Published'),
          },
          {
            title: 'Drafts',
            value: String(stats.draftNotices || 0),
            subtitle: 'Pending Review',
            iconName: 'FileText',
            variant: 'info',
            onPress: () => setActiveKpiCard(activeKpiCard === 'Draft' ? null : 'Draft'),
          },
          {
            title: 'Urgent Alerts',
            value: String(stats.urgentNotices || 0),
            subtitle: 'High Priority',
            iconName: 'AlertCircle',
            variant: stats.urgentNotices > 0 ? 'destructive' : 'default',
            onPress: () => setActiveKpiCard(activeKpiCard === 'High' ? null : 'High'),
          },
          {
            title: 'Expired',
            value: String(stats.expiredNotices || 0),
            subtitle: 'Past Notices',
            iconName: 'AlertTriangle',
            variant: stats.expiredNotices > 0 ? 'warning' : 'default',
            onPress: () => setActiveKpiCard(activeKpiCard === 'Expired' ? null : 'Expired'),
          },
        ]}
      />

      {/* Filter Bar */}
      <NoticeManagementFilterBar
        search={localSearch}
        filters={filters}
        sort={sort}
        onSearchChange={handleSearchChange}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        onReset={resetFilters}
        hideStatusFilter={false}
      />
    </View>
  );

  return (
    <ScreenShell
      title="Manage Notices"
      subtitle="Administer community announcements and alerts"
      iconName="Megaphone"
      loading={(loading || dashboardLoading) && notices.length === 0}
      error={error}
      onRetry={handleRefresh}
      headerRight={
        canCreate ? (
          <Button
            size="sm"
            onPress={() => router.push('/(resident)/notices/create' as any)}
            accessibilityLabel="Create Notice"
            className="bg-emerald-600 active:bg-emerald-700 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          >
            <Text className="text-white font-bold text-xs">Create Notice</Text>
          </Button>
        ) : null
      }
    >
      <View className="flex-1 bg-background">
        {/* Admin Notices List */}
        {loading && notices.length === 0 ? (
          <NoticeBoardLoadingSkeleton />
        ) : (
          <PaginatedList<NoticeItem>
            data={notices}
            renderItem={renderNoticeItem}
            keyExtractor={(item) => item._id || item.id || ''}
            loading={loading}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            pagination={{
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
              totalRecords: pagination.totalRecords || notices.length,
              limit: 20,
            }}
            ListHeaderComponent={renderHeader()}
            emptyIcon="Megaphone"
            emptyTitle="No Notices Available"
            emptySubtitle="No notices found matching the selected taxonomy filters or search criteria."
            contentContainerClassName="px-4 pt-3 pb-28"
          />
        )}
      </View>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!deleteConfirmId}
        title="Delete Community Notice?"
        message="Are you sure you want to permanently delete this notice? This action cannot be undone."
        variant="danger"
        confirmLabel="Delete Notice"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </ScreenShell>
  );
}

export default function ManageNoticesScreen() {
  return (
    <ErrorBoundary>
      <ManageNoticesContent />
    </ErrorBoundary>
  );
}
