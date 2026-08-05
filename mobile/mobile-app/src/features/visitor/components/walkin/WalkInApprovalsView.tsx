import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { PaginatedList } from '@/components/ui/PaginatedList';
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
    <View className="flex-1 bg-background">
      {/* Error Retry Banner */}
      {walkIns?.status === 'failed' && (
        <View className="p-3 mx-4 my-2 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center justify-between">
          <Text className="text-xs text-destructive flex-1 font-medium me-2">
            {walkIns.error || 'Failed to load pending walk-in requests.'}
          </Text>
          <Button size="sm" variant="outline" onPress={loadData}>
            <Text className="text-xs font-semibold">Retry</Text>
          </Button>
        </View>
      )}

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
        contentContainerClassName="p-4 gap-3"
        renderItem={(item) => (
          <WalkInApprovalCard
            key={item.id}
            item={item}
            onApprove={(i) => handleApprove(i.id)}
            onReject={(i) => handleReject(i.id)}
            onPressDetails={(i) => {
              setSelectedItem(i);
              setModalOpen(true);
            }}
          />
        )}
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
    </View>
  );
};

export default WalkInApprovalsView;
