import React, { useState, useEffect, useCallback } from 'react';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { WalkInApprovalCard } from './WalkInApprovalCard';
import { WalkInVisitorDetailsModal } from './WalkInVisitorDetailsModal';
import { WalkInApprovalItem } from '../../mocks/visitorMocks';
import { useVisitorPass } from '../../hooks/useVisitorPass';

export const WalkInApprovalsView: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<WalkInApprovalItem | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const { walkIns, loadPendingWalkIns, resolveWalkIn } = useVisitorPass();

  const loadData = useCallback(async () => {
    await loadPendingWalkIns();
  }, [loadPendingWalkIns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleApprove = useCallback(
    async (id: string) => {
      await resolveWalkIn(id, 'APPROVE');
    },
    [resolveWalkIn]
  );

  const handleReject = useCallback(
    async (id: string) => {
      await resolveWalkIn(id, 'REJECT');
    },
    [resolveWalkIn]
  );

  const isLoading = walkIns?.status === 'loading' && !refreshing && (walkIns?.pendingList?.length || 0) === 0;

  return (
    <>
      <PaginatedList<WalkInApprovalItem>
        data={walkIns?.pendingList || []}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          totalRecords: walkIns?.pendingList?.length || 0,
          limit: 20,
        }}
        onLoadMore={() => {}}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        loading={isLoading}
        emptyIcon="ShieldCheck"
        emptyTitle="No Pending Walk-In Requests"
        emptySubtitle="All visitor gate requests have been reviewed."
        contentContainerClassName="px-4 pt-3 pb-28 gap-3.5"
        ListHeaderComponent={
          walkIns?.status === 'failed' ? (
            <ErrorBanner
              message={walkIns.error || 'Failed to load pending walk-in requests.'}
              onRetry={loadData}
              className="mb-3"
            />
          ) : null
        }
        renderItem={(item) => {
          if (!item) return null;
          return (
            <WalkInApprovalCard
              item={item}
              onApprove={(i) => handleApprove(i.id)}
              onReject={(i) => handleReject(i.id)}
              onPressDetails={(i) => {
                setSelectedItem(i);
                setModalOpen(true);
              }}
            />
          );
        }}
      />

      <WalkInVisitorDetailsModal
        visible={modalOpen}
        item={selectedItem}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
        onApprove={(id) => handleApprove(id)}
        onReject={(id) => handleReject(id)}
      />
    </>
  );
};

export default WalkInApprovalsView;
