import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { FAB } from '@/components/ui/FAB';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { VisitorPass } from '@/src/features/visitor/store/visitorPassSlice';
import { VisitorPassCard } from '@/src/features/visitor/components/VisitorPassCard';
import { VisitorPassDetailsModal } from '@/src/features/visitor/components/VisitorPassDetailsModal';
import { VisitorInvitationTypeSheet } from '@/src/features/visitor/components/shared/VisitorInvitationTypeSheet';
import { PassTypeKey } from '@/src/features/visitor/mocks/visitorMocks';
import { Plus, UserPlus, ShieldAlert } from 'lucide-react-native';

export default function ResidentPassesScreen() {
  const router = useRouter();
  const {
    passes,
    activePass,
    walkIns,
    pagination,
    status,
    actionStatus,
    error,
    fetchPasses,
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

  // Initial fetch on screen load
  useEffect(() => {
    fetchPasses({ page: 1 });
    loadPendingWalkIns();
  }, [fetchPasses, loadPendingWalkIns]);

  const handleRefresh = useCallback(() => {
    fetchPasses({ page: 1 });
    loadPendingWalkIns();
  }, [fetchPasses, loadPendingWalkIns]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages) {
      fetchPasses({ page: pagination.currentPage + 1, append: true });
    }
  }, [pagination, fetchPasses]);

  // Filtered passes list
  const filteredPasses = React.useMemo(() => {
    return passes.filter((pass: VisitorPass) => {
      const matchesSearch = search.trim() === '' ||
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
      fetchPasses();
    }
  };

  const pendingWalkInCount = walkIns?.pendingList?.length || 0;

  return (
    <ScreenShell
      title="Resident Visitor Passes"
      subtitle="Manage guest entry & QR invitations"
      headerRight={
        <Button
          size="sm"
          variant="default"
          onPress={() => setInviteSheetOpen(true)}
          className="flex-row items-center gap-1.5 rounded-full"
        >
          <UserPlus size={14} className="text-primary-foreground" />
          <Text className="text-xs font-bold text-primary-foreground">New Pass</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Pending Walk-In Approval Alert Banner */}
        {pendingWalkInCount > 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/(resident)/visitor/walk-ins' as any)}
            activeOpacity={0.8}
            className="bg-amber-500/15 border border-amber-500/30 p-3 mx-4 mt-3 rounded-2xl flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2 flex-1">
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 flex-1">
                {pendingWalkInCount} Walk-In Approval{pendingWalkInCount > 1 ? 's' : ''} Waiting at Gate
              </Text>
            </View>
            <Text className="text-xs font-extrabold text-amber-600 dark:text-amber-400 underline">
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
          variant="bordered"
        />

        {/* Paginated List of Passes */}
        <PaginatedList<VisitorPass>
          data={filteredPasses}
          pagination={pagination}
          loading={status === 'loading'}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          emptyIcon="QrCode"
          emptyTitle="No Visitor Passes Found"
          emptySubtitle="Create a visitor pass to pre-approve guests and send QR invites."
          contentContainerClassName="p-4"
          renderItem={(pass) => (
            <VisitorPassCard
              key={pass._id}
              pass={pass}
              onPress={(p) => {
                selectPass(p);
                setDetailsModalOpen(true);
              }}
              onShowQR={(p) => {
                selectPass(p);
                setDetailsModalOpen(true);
              }}
            />
          )}
        />

        {/* Floating Action Button */}
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
      </View>
    </ScreenShell>
  );
}
