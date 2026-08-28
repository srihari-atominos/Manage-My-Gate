import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/ui/KPICard';
import { FAB } from '@/components/ui/FAB';
import { VisitorPassCard } from '@/src/features/visitor/components/VisitorPassCard';
import { VisitorInvitationTypeSheet } from '@/src/features/visitor/components/shared/VisitorInvitationTypeSheet';
import { VisitorLogDetailsModal } from '@/src/features/visitor/components/history/VisitorLogDetailsModal';
import { ExtendedVisitorPass, PassTypeKey } from '@/src/features/visitor/mocks/visitorMocks';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { mapBackendPassToHistoryItem } from '@/src/features/visitor/utils/mapBackendPassToHistoryItem';
import { UserPlus, History, ShieldAlert } from 'lucide-react-native';

export default function VisitorDashboardScreen() {
  const router = useRouter();
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<ExtendedVisitorPass | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { dashboard, fetchDashboardData } = useVisitorPass();

  const loadData = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSelectType = (type: PassTypeKey) => {
    setInviteSheetOpen(false);
    router.push({ pathname: '/(resident)/visitor/invite' as any, params: { type } });
  };

  const mappedRecentPasses = useMemo(() => {
    if (!Array.isArray(dashboard?.recentPasses)) return [];
    return dashboard.recentPasses.map((p: any) => mapBackendPassToHistoryItem(p));
  }, [dashboard?.recentPasses]);

  const pendingWalkInsCount = dashboard?.pendingWalkIns?.length || 0;
  const activePassesCount = dashboard?.activePassesCount || 0;
  const isLoading = dashboard?.status === 'loading' && !refreshing && mappedRecentPasses.length === 0;

  return (
    <ScreenShell
      title="Visitors & Passes"
      subtitle="Resident entry approvals, QR passes & gate logs"
      headerRight={
        <TouchableOpacity
          onPress={() => setInviteSheetOpen(true)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-primary px-3 py-1.5 rounded-full"
        >
          <UserPlus size={14} color="#fff" />
          <Text className="text-xs font-bold text-primary-foreground">Invite Visitor</Text>
        </TouchableOpacity>
      }
    >
      <View className="flex-1 bg-background">
        {/* Fixed Top Controls: KPI Statistics, Quick Actions & Recent Passes Header */}
        <View className="p-4 pb-3 gap-3 bg-background border-b border-border/40 shadow-xs z-10">
          {/* KPI Statistics */}
          <View className="flex-row gap-3">
            <KPICard
              title="Active Passes"
              value={String(activePassesCount)}
              iconName="ShieldCheck"
              iconColor="#16a34a"
              trend={{ direction: 'up', value: 'Live' }}
            />
            <KPICard
              title="Walk-In Waiting"
              value={String(pendingWalkInsCount)}
              iconName="Clock"
              iconColor="#ea580c"
              trend={{
                direction: pendingWalkInsCount > 0 ? 'down' : 'up',
                value: pendingWalkInsCount > 0 ? 'Needs action' : 'Clear',
              }}
            />
          </View>

          {/* Quick Action Navigation Grid */}
          <View className="bg-card border border-border rounded-2xl p-3 gap-2">
            <Text variant="small" className="text-muted-foreground uppercase font-bold text-[10px]">
              Quick Actions
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setInviteSheetOpen(true)}
                activeOpacity={0.8}
                className="flex-1 bg-primary/10 border border-primary/20 p-2.5 rounded-xl items-center gap-1"
              >
                <UserPlus size={18} className="text-primary" />
                <Text className="text-xs font-bold text-primary text-center">New Invite</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(resident)/visitor/history' as any)}
                activeOpacity={0.8}
                className="flex-1 bg-muted border border-border p-2.5 rounded-xl items-center gap-1"
              >
                <History size={18} className="text-foreground" />
                <Text className="text-xs font-bold text-foreground text-center">History Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(resident)/visitor/walk-ins' as any)}
                activeOpacity={0.8}
                className="flex-1 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl items-center gap-1"
              >
                <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
                <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 text-center">
                  Walk-Ins ({pendingWalkInsCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fixed Section Header */}
          <View className="flex-row items-center justify-between pt-1">
            <Text variant="h3" className="font-bold text-foreground">
              Recent Visitor Passes
            </Text>
            <TouchableOpacity onPress={() => router.push('/(resident)/visitor/history' as any)}>
              <Text className="text-xs font-semibold text-primary">View All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Visitor Cards Container */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 pt-3 gap-2.5 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Error Retry State */}
          {dashboard?.status === 'failed' && (
            <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-destructive flex-1 font-medium me-2">
                {dashboard.error || 'Failed to load dashboard data.'}
              </Text>
              <Button size="sm" variant="outline" onPress={loadData}>
                <Text className="text-xs font-semibold">Retry</Text>
              </Button>
            </View>
          )}

          {isLoading ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" className="text-primary" />
            </View>
          ) : mappedRecentPasses.length === 0 ? (
            <View className="p-6 bg-card border border-border rounded-2xl items-center justify-center gap-2">
              <Text className="text-sm font-semibold text-muted-foreground text-center">
                No Active Visitor Passes
              </Text>
              <Text className="text-xs text-muted-foreground text-center">
                Create a new pass to pre-approve visitor entry at the gate.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {mappedRecentPasses.map((pass: ExtendedVisitorPass) => (
                <VisitorPassCard
                  key={pass._id}
                  pass={pass}
                  onPress={(p) => {
                    setSelectedPass(p as ExtendedVisitorPass);
                    setDetailsModalOpen(true);
                  }}
                  onShowQR={(p) => {
                    setSelectedPass(p as ExtendedVisitorPass);
                    setDetailsModalOpen(true);
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

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

      {/* Visitor Log Details Modal */}
      <VisitorLogDetailsModal
        visible={detailsModalOpen}
        pass={selectedPass}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPass(null);
        }}
      />
    </ScreenShell>
  );
}
