import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useSelector } from 'react-redux';
import { selectActiveOrgId } from '@/src/features/auth/store/authSelectors';
import visitorService from '../../services/visitorService';
import { LogOut, ShieldCheck, Users } from 'lucide-react-native';

export const InsideVisitorsView: React.FC = () => {
  const activeOrgId = useSelector(selectActiveOrgId);
  const [insideLogs, setInsideLogs] = useState<any[]>([]);
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

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-3 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View className="flex-row items-center justify-between bg-card border border-border rounded-xl p-3">
          <View className="flex-row items-center gap-2">
            <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
            <Text className="text-sm font-bold text-foreground">Active Visitors Currently Inside</Text>
          </View>
          <Text className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            {insideLogs.length} Inside
          </Text>
        </View>

        {insideLogs.length === 0 ? (
          <View className="p-8 bg-card border border-border rounded-2xl items-center justify-center gap-2">
            <ShieldCheck size={36} className="text-muted-foreground opacity-50" />
            <Text className="text-sm font-semibold text-foreground text-center">No Active Visitors Inside</Text>
            <Text className="text-xs text-muted-foreground text-center">
              All entered visitors have been checked out at the gate.
            </Text>
          </View>
        ) : (
          insideLogs.map((log: any) => (
            <ListCard
              key={log._id}
              title={log.snapshot?.visitorName || log.visitorName || 'Visitor'}
              subtitle={`Checked in: ${log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}${log.snapshot?.vehicleNumber ? ` • Vehicle: ${log.snapshot.vehicleNumber}` : ''}`}
              leftIcon="ShieldCheck"
              leftIconBgColor="rgba(16, 185, 129, 0.1)"
              leftIconColor="#10b981"
              status={{ label: 'INSIDE', variant: 'success' }}
              rightContent={
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setSelectedLogId(log._id)}
                  className="flex-row items-center gap-1 h-8 px-2.5 rounded-lg border-emerald-500/30 bg-emerald-500/5"
                >
                  <LogOut size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Check Out</Text>
                </Button>
              }
            />
          ))
        )}
      </ScrollView>

      <ConfirmationModal
        visible={Boolean(selectedLogId)}
        title="Check Out Visitor?"
        message="Are you sure you want to mark this visitor as checked out at the gate?"
        variant="info"
        confirmLabel="Confirm Check-Out"
        onConfirm={handleConfirmCheckout}
        onCancel={() => setSelectedLogId(null)}
      />
    </View>
  );
};

export default InsideVisitorsView;
