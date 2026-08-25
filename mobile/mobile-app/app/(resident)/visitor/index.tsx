import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { type KPICardProps } from '@/components/ui/KPICard';
import { ActionGrid, type ActionGridItem } from '@/components/ui/ActionGrid';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/button';
import { FAB } from '@/components/ui/FAB';
import { VisitorPassCard } from '@/src/features/visitor/components/VisitorPassCard';
import { VisitorInvitationTypeSheet } from '@/src/features/visitor/components/shared/VisitorInvitationTypeSheet';
import { VisitorLogDetailsModal } from '@/src/features/visitor/components/history/VisitorLogDetailsModal';
import { ExtendedVisitorPass, PassTypeKey } from '@/src/features/visitor/mocks/visitorMocks';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { mapBackendPassToHistoryItem } from '@/src/features/visitor/utils/mapBackendPassToHistoryItem';
import { UserPlus, History, ShieldAlert, ShieldCheck } from 'lucide-react-native';

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

  const visitorKpis: KPICardProps[] = [
    {
      title: 'Active Passes',
      value: String(activePassesCount),
      iconName: 'ShieldCheck',
      variant: 'success',
      trend: { direction: 'up', value: 'Live' },
    },
    {
      title: 'Walk-In Waiting',
      value: String(pendingWalkInsCount),
      iconName: 'Clock',
      variant: 'warning',
      trend: {
        direction: pendingWalkInsCount > 0 ? 'down' : 'up',
        value: pendingWalkInsCount > 0 ? 'Needs action' : 'Clear',
      },
    },
  ];

  const visitorActions: ActionGridItem[] = [
    {
      id: 'invite',
      name: 'New Invite',
      iconName: 'UserPlus',
      colorBg: 'bg-primary/10',
      colorIcon: '#6366f1',
      onPress: () => setInviteSheetOpen(true),
    },
    {
      id: 'history',
      name: 'History Logs',
      iconName: 'History',
      colorBg: 'bg-slate-500/10',
      colorIcon: '#64748b',
      route: '/(resident)/visitor/history',
    },
    {
      id: 'walkins',
      name: 'Walk-Ins',
      iconName: 'ShieldAlert',
      colorBg: 'bg-amber-500/10',
      colorIcon: '#f59e0b',
      badge: pendingWalkInsCount > 0 ? pendingWalkInsCount : undefined,
      badgeColor: 'bg-amber-500',
      route: '/(resident)/visitor/walk-ins',
    },
  ];

  return (
    <ScreenShell
      title="Visitors & Passes"
      subtitle="Resident entry approvals, QR passes & gate logs"
      iconName="ShieldCheck"
      loading={isLoading}
      error={dashboard?.status === 'failed' ? (dashboard?.error || 'Failed to load dashboard data.') : null}
      onRetry={loadData}
      headerRight={
        <Button
          variant="outline"
          size="sm"
          onPress={() => router.push('/(resident)/visitor/history' as any)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="View Pass History"
        >
          <History size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">History</Text>
        </Button>
      }
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 pb-28 gap-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Universal KPI Statistics Strip (2-Column Balanced Row) */}
        <KPIDashboardStrip cards={visitorKpis} />

        {/* Universal 3-Column ActionGrid */}
        <ActionGrid title="Quick Actions" items={visitorActions} />

        {/* Canonical Section Header */}
        <SectionHeader
          title="Recent Activity"
          actionLabel="View All"
          onAction={() => router.push('/(resident)/visitor/history' as any)}
          className="px-0 bg-transparent dark:bg-transparent"
        />

        {/* Visitor Cards */}
        {mappedRecentPasses.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No Active Visitor Passes"
            description="Create a new pass to pre-approve visitor entry at the gate."
            actionLabel="New Invite"
            onAction={() => setInviteSheetOpen(true)}
          />
        ) : (
          <View className="gap-2.5">
            {mappedRecentPasses.slice(0, 3).map((pass: ExtendedVisitorPass) => (
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
