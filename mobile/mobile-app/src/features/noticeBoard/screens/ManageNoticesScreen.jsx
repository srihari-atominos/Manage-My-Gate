import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ListCard } from '@/components/ui/ListCard';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Text } from '@/components/ui/text';
import { KPICard } from '@/components/ui/KPICard';
import { KPIRow } from '@/components/ui/KPIRow';
import { Button } from '@/components/common/Button';
import { FAB } from '@/components/ui/FAB';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { useNoticeSocket } from '../hooks/useNoticeSocket';
import { 
  NoticeCard, 
  ErrorBoundary,
  NoticeBoardFilters,
  DeleteNoticeDialog,
  NoticeBoardEmptyState,
  NoticeBoardLoadingSkeleton
} from '../components';
import { debounce } from '../utils/debounce';
import { Plus, CheckCircle, FileText, Clock, AlertTriangle, AlertCircle } from 'lucide-react-native';

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'createdAt_desc' },
  { label: 'Oldest First', value: 'createdAt_asc' },
  { label: 'Highest Priority', value: 'priority_desc' },
];

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

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [localSearch, setLocalSearch] = useState(search);

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
    setLocalSearch(search);
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
    debounce((value) => {
      setSearch(value);
    }, 300),
    [setSearch]
  );

  const handleSearchChange = useCallback((value) => {
    setLocalSearch(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  const handleSortChange = useCallback((option) => {
    const [sortBy, sortOrder] = option.value.split('_');
    setSort({ sortBy, sortOrder });
  }, [setSort]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirmId) {
      await removeNotice(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, removeNotice]);

  const handleStatusChange = useCallback(async (id, newStatus) => {
    const formData = new FormData();
    formData.append('status', newStatus);
    await modifyNotice(id, formData);
  }, [modifyNotice]);

  const handlePinToggle = useCallback(async (id, currentPinState) => {
    await changePinStatus(id, !currentPinState);
  }, [changePinStatus]);

  const handleEditPress = useCallback((id) => {
    router.push({
      pathname: '/(resident)/notices/create',
      params: { id },
    });
  }, [router]);

  const handleCardPress = useCallback((notice) => {
    router.push({
      pathname: '/(resident)/notices/[id]',
      params: { id: notice._id },
    });
  }, [router]);

  const handleDeletePress = useCallback((id) => {
    setDeleteConfirmId(id);
  }, []);

  const renderNoticeItem = useCallback((notice) => (
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
  ), [handleCardPress, handlePinToggle, handleStatusChange, handleEditPress, handleDeletePress, canPin, canUpdate, canDelete]);

  const activeSortOption = SORT_OPTIONS.find((opt) => opt.value === `${sort.sortBy}_${sort.sortOrder}`) || SORT_OPTIONS[0];
  const stats = dashboardStats?.kpis || {};

  return (
    <ScreenShell
      title="Manage Notices"
      subtitle="Administer community announcements and alerts"
      loading={(loading || dashboardLoading) && notices.length === 0}
      headerRight={
        canCreate ? (
          <Button
            variant="default"
            size="sm"
            onPress={() => router.push('/(resident)/notices/create')}
            accessibilityLabel="Create Notice"
          >
            Create Notice
          </Button>
        ) : null
      }
    >
      <View className="flex-1 bg-background">
        {/* Admin KPI Stats Dashboard Header */}
        <View className="py-4 bg-background border-b border-border/40 shadow-xs z-10">
          <KPIRow
            cards={[
              {
                title: "Active Notices",
                value: String(stats.activeNotices || 0),
                iconName: "CheckCircle",
                iconColor: "#16a34a",
                onPress: () => setActiveKpiCard(activeKpiCard === 'Published' ? null : 'Published'),
                className: activeKpiCard === 'Published' ? 'border-2 border-emerald-500 w-40' : 'w-40'
              },
              {
                title: "Drafts",
                value: String(stats.draftNotices || 0),
                iconName: "FileText",
                iconColor: "#2563eb",
                onPress: () => setActiveKpiCard(activeKpiCard === 'Draft' ? null : 'Draft'),
                className: activeKpiCard === 'Draft' ? 'border-2 border-blue-500 w-40' : 'w-40'
              },
              {
                title: "Urgent Alerts",
                value: String(stats.urgentNotices || 0),
                iconName: "AlertCircle",
                iconColor: "#dc2626",
                onPress: () => setActiveKpiCard(activeKpiCard === 'High' ? null : 'High'),
                className: activeKpiCard === 'High' ? 'border-2 border-red-500 w-40' : 'w-40'
              },
              {
                title: "Expired",
                value: String(stats.expiredNotices || 0),
                iconName: "AlertTriangle",
                iconColor: "#d97706",
                onPress: () => setActiveKpiCard(activeKpiCard === 'Expired' ? null : 'Expired'),
                className: activeKpiCard === 'Expired' ? 'border-2 border-amber-500 w-40' : 'w-40'
              }
            ]}
          />
        </View>

        {/* Filter Bar */}
        <View className="px-4 py-3 bg-card border-b border-border" style={{ zIndex: 50 }}>
          <NoticeBoardFilters 
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

        {/* Admin Notices List */}
        <View className="flex-1">
          {error && notices.length === 0 && (
            <View className="m-4 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
              <Text className="text-destructive font-semibold text-center">{error}</Text>
            </View>
          )}
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
              contentContainerClassName="pt-3 pb-24"
            />
          )}
        </View>
      </View>

      {/* Floating Action Button */}
      {canCreate && (
        <FAB
          iconName="Plus"
          label="Create Notice"
          onPress={() => router.push('/(resident)/notices/create')}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteNoticeDialog
        visible={!!deleteConfirmId}
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
