import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useSelector } from 'react-redux';
import { selectActiveOrgId } from '@/src/features/auth/store/authSelectors';
import visitorService from '../../services/visitorService';
import { LogOut, Users } from 'lucide-react-native';

export interface ActiveVisitorLog {
  _id: string;
  visitorName?: string;
  checkInTime?: string;
  snapshot?: {
    visitorName?: string;
    vehicleNumber?: string;
    idProofNumber?: string;
  };
}

export const InsideVisitorsView: React.FC = () => {
  const activeOrgId = useSelector(selectActiveOrgId);
  const [insideLogs, setInsideLogs] = useState<ActiveVisitorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const fetchInsideLogs = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const res = await visitorService.getActiveVisitors(activeOrgId);
      const body = res && (res as any).success !== undefined ? res : (res as any)?.data;
      const list = Array.isArray(body?.data || body) ? body?.data || body : [];
      setInsideLogs(list);
    } catch (err) {
      console.error('Failed to fetch active visitors inside:', err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchInsideLogs();
  }, [fetchInsideLogs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInsideLogs();
    setRefreshing(false);
  }, [fetchInsideLogs]);

  const handleConfirmCheckout = async () => {
    if (selectedLogId) {
      try {
        await visitorService.checkoutVisitor(selectedLogId);
        setSelectedLogId(null);
        fetchInsideLogs();
      } catch (err) {
        console.error('Failed to checkout visitor:', err);
      }
    }
  };

  const renderHeader = () => (
    <View className="flex-row items-center justify-between bg-card border border-border rounded-2xl p-3.5 mb-3">
      <View className="flex-row items-center gap-2">
        <Users size={18} className="text-status-success" />
        <Text className="text-sm font-bold text-foreground">Active Visitors Inside</Text>
      </View>
      <Text className="text-xs font-extrabold text-status-success bg-status-success/15 px-3 py-1 rounded-full">
        {insideLogs.length} On-Premises
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <PaginatedList<ActiveVisitorLog>
        data={insideLogs}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          totalRecords: insideLogs.length,
          limit: 50,
        }}
        onLoadMore={() => {}}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        loading={loading && !refreshing && insideLogs.length === 0}
        ListHeaderComponent={renderHeader()}
        emptyIcon="ShieldCheck"
        emptyTitle="No Active Visitors Inside"
        emptySubtitle="All entered visitors have been checked out at the security gate."
        contentContainerClassName="px-4 pt-3 pb-28 gap-3"
        renderItem={(log) => {
          if (!log) return null;
          return (
            <ListCard
              title={log.snapshot?.visitorName || log.visitorName || 'Visitor'}
              subtitle={`Checked in: ${
                log.checkInTime
                  ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Recently'
              }${log.snapshot?.vehicleNumber ? ` • Vehicle: ${log.snapshot.vehicleNumber}` : ''}`}
              leftIcon="ShieldCheck"
              leftIconBgColor="bg-status-success/15"
              status={{ label: 'INSIDE', variant: 'success' }}
              rightContent={
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setSelectedLogId(log._id)}
                  className="flex-row items-center gap-1 h-8 px-2.5 rounded-xl border-status-success/30 bg-status-success/10"
                  accessibilityLabel="Check Out Visitor"
                >
                  <LogOut size={13} className="text-status-success" />
                  <Text className="text-xs font-bold text-status-success">Check Out</Text>
                </Button>
              }
            />
          );
        }}
      />

      <ConfirmationModal
        visible={Boolean(selectedLogId)}
        title="Check Out Visitor?"
        message="Are you sure you want to mark this visitor as checked out at the gate desk?"
        variant="info"
        confirmLabel="Confirm Check-Out"
        onConfirm={handleConfirmCheckout}
        onCancel={() => setSelectedLogId(null)}
      />
    </View>
  );
};

export default InsideVisitorsView;
