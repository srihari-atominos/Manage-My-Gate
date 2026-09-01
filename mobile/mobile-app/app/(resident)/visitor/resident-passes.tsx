import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { FAB } from '@/components/ui/FAB';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { VisitorPass } from '@/src/features/visitor/store/visitorPassSlice';
import { VisitorPassCard } from '@/src/features/visitor/components/VisitorPassCard';
import { VisitorPassDetailsModal } from '@/src/features/visitor/components/VisitorPassDetailsModal';
import { VisitorInvitationTypeSheet } from '@/src/features/visitor/components/shared/VisitorInvitationTypeSheet';
import { PassTypeKey } from '@/src/features/visitor/mocks/visitorMocks';
import { ShieldAlert } from 'lucide-react-native';

export default function ResidentPassesScreen() {
  const router = useRouter();
  const {
    passes,
    activePass,
    activeVisitors,
    walkIns,
    pagination,
    status,
    actionStatus,
    fetchPasses,
    fetchActiveVisitors,
    loadPendingWalkIns,
    revokePass,
    selectPass,
  } = useVisitorPass();

  const [search, setSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ALL');
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [selectedPassToRevoke, setSelectedPassToRevoke] = useState<VisitorPass | null>(null);

  const fetchFilteredPasses = useCallback((page: number = 1, append: boolean = false) => {
    const statuses = activeStatusFilter === 'ALL' ? 'PENDING,ACTIVE,REVOKED,EXPIRED' : activeStatusFilter;
    fetchPasses({ page, append, statuses });
    fetchActiveVisitors();
  }, [fetchPasses, fetchActiveVisitors, activeStatusFilter]);

  // Initial fetch on screen load
  useEffect(() => {
    fetchFilteredPasses(1, false);
    loadPendingWalkIns();
  }, [fetchFilteredPasses, loadPendingWalkIns]);

  const handleRefresh = useCallback(() => {
    fetchFilteredPasses(1, false);
    loadPendingWalkIns();
  }, [fetchFilteredPasses, loadPendingWalkIns]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages) {
      fetchFilteredPasses(pagination.currentPage + 1, true);
    }
  }, [pagination, fetchFilteredPasses]);

  // Filtered passes list
  const filteredPasses = useMemo(() => {
    return passes.filter((pass: VisitorPass) => {
      const matchesSearch =
        search.trim() === '' ||
        (pass.visitorName && pass.visitorName.toLowerCase().includes(search.toLowerCase())) ||
        (pass.phone && pass.phone.includes(search)) ||
        (pass.code && pass.code.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = activeStatusFilter === 'ALL' || pass.status === activeStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [passes, search, activeStatusFilter]);

  const handleSelectType = (type: PassTypeKey) => {
    setInviteSheetOpen(false);
    router.push({ pathname: '/(resident)/visitor/invite' as any, params: { type } });
  };

  const handleConfirmRevoke = async () => {
    if (selectedPassToRevoke) {
      await revokePass(selectedPassToRevoke._id);
      setSelectedPassToRevoke(null);
      setRevokeConfirmOpen(false);
      fetchFilteredPasses(1, false);
    }
  };

  const pendingWalkInCount = walkIns?.pendingList?.length || 0;

  const renderHeader = () => (
    <View className="gap-3 mb-3">
      {/* Pending Walk-In Approval Alert Banner */}
      {pendingWalkInCount > 0 ? (
        <TouchableOpacity
          onPress={() => router.push('/(resident)/visitor/walk-ins' as any)}
          activeOpacity={0.8}
          className="bg-status-warning/15 border border-status-warning/30 p-3 rounded-2xl flex-row items-center justify-between"
          accessibilityRole="button"
          accessibilityLabel="Review pending walk-in approvals"
        >
          <View className="flex-row items-center gap-2 flex-1 me-2">
            <Icon as={ShieldAlert} size={18} className="text-status-warning shrink-0" />
            <Text className="text-xs font-bold text-status-warning flex-1">
              {pendingWalkInCount} Walk-In Approval{pendingWalkInCount > 1 ? 's' : ''} Waiting at Gate
            </Text>
          </View>
          <Text className="text-xs font-extrabold text-status-warning underline">
            Review →
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by visitor name or code..."
        sortOptions={[
          { label: 'All', value: 'ALL' },
          { label: 'Active', value: 'ACTIVE' },
          { label: 'Pending', value: 'PENDING' },
          { label: 'Revoked', value: 'REVOKED' },
          { label: 'Expired', value: 'EXPIRED' },
        ]}
        currentSort={activeStatusFilter}
        onSortChange={setActiveStatusFilter}
        variant="default"
        className="px-0 py-0 border-0"
      />
    </View>
  );

  return (
    <ScreenShell
      title="Resident Visitor Passes"
      subtitle="Manage guest entry & QR invitations"
      iconName="UserCheck"
    >
      {/* Paginated List of Passes with ListHeaderComponent */}
      <PaginatedList<VisitorPass>
        data={filteredPasses}
        pagination={pagination}
        loading={status === 'loading'}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        ListHeaderComponent={renderHeader()}
        emptyIcon="QrCode"
        emptyTitle="No Visitor Passes Found"
        emptySubtitle="Create a visitor pass to pre-approve guests and send QR invites."
        contentContainerClassName="px-4 pt-3 pb-28"
        renderItem={(pass) => {
          const isInside = activeVisitors?.some((l) => {
            const lPassId = (l.passId?._id || l.passId)?.toString();
            return lPassId && (lPassId === pass._id || lPassId === (pass as any).id);
          });

          return (
            <VisitorPassCard
              key={pass._id}
              pass={pass}
              isInside={isInside}
              onPress={(p) => {
                selectPass(p);
                setDetailsModalOpen(true);
              }}
              onShowQR={(p) => {
                selectPass(p);
                setDetailsModalOpen(true);
              }}
            />
          );
        }}
      />

      {/* Floating Action Button for Resident View */}
      <FAB
        iconName="Plus"
        label="Invite Visitor"
        onPress={() => setInviteSheetOpen(true)}
      />

      {/* Invitation Type Selector Bottom Sheet */}
      <VisitorInvitationTypeSheet
        visible={inviteSheetOpen}
        onClose={() => setInviteSheetOpen(false)}
        onSelectType={handleSelectType}
      />

      {/* Pass Details Modal */}
      <VisitorPassDetailsModal
        visible={detailsModalOpen}
        pass={activePass}
        onClose={() => setDetailsModalOpen(false)}
        onRevokePress={(passToRevoke) => {
          setSelectedPassToRevoke(passToRevoke);
          setRevokeConfirmOpen(true);
        }}
      />

      {/* Revoke Confirmation Dialog */}
      <ConfirmationModal
        visible={revokeConfirmOpen}
        title="Revoke Visitor Pass?"
        message={`Are you sure you want to revoke entry pass for ${selectedPassToRevoke?.visitorName || 'this visitor'}?`}
        variant="danger"
        confirmLabel="Revoke Pass"
        onConfirm={handleConfirmRevoke}
        onCancel={() => {
          setRevokeConfirmOpen(false);
          setSelectedPassToRevoke(null);
        }}
        loading={actionStatus === 'loading'}
      />
    </ScreenShell>
  );
}
