import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { type KPICardProps } from '@/components/ui/KPICard';
import { ActionGrid, type ActionGridItem } from '@/components/ui/ActionGrid';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { Button } from '@/components/ui/button';
import { VisitorAnalyticsCard } from '@/src/features/visitor/components/admin/VisitorAnalyticsCard';
import { VisitorPassCard } from '@/src/features/visitor/components/VisitorPassCard';
import { VisitorLogDetailsModal } from '@/src/features/visitor/components/history/VisitorLogDetailsModal';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { mapBackendPassToHistoryItem } from '@/src/features/visitor/utils/mapBackendPassToHistoryItem';
import { UserPlus, ShieldAlert, History, Filter, BarChart2, ShieldX, ShieldCheck } from 'lucide-react-native';

export default function AdminVisitorDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  const {
    communityPasses,
    analytics,
    status,
    error,
    loadCommunityPasses,
    loadAnalytics,
  } = useAdminVisitor();

  const isLoading = status === 'loading' && !refreshing && communityPasses.length === 0;

  const loadData = useCallback(async () => {
    await Promise.all([loadCommunityPasses({ page: 1, limit: 5 }), loadAnalytics()]);
  }, [loadCommunityPasses, loadAnalytics]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const activeVisitorsCount = analytics?.activeInsideCount ?? 0;
  const pendingCount = analytics?.pendingApprovalsCount ?? 0;
  const totalEntries = analytics?.totalEntriesToday ?? 0;
  const blacklistedCount = analytics?.totalBlacklistedCount ?? 0;

  const adminKpis: KPICardProps[] = [
    {
      title: 'Inside Now',
      value: String(activeVisitorsCount),
      iconName: 'ShieldCheck',
      variant: 'success',
      trend: { direction: 'up', value: 'Live' },
    },
    {
      title: 'Pending Gate',
      value: String(pendingCount),
      iconName: 'Clock',
      variant: 'warning',
      trend: { direction: pendingCount > 0 ? 'down' : 'up', value: pendingCount > 0 ? 'Needs Action' : 'Clear' },
    },
    {
      title: 'Today Entries',
      value: String(totalEntries),
      iconName: 'BarChart2',
      subtitle: 'Total processed',
      variant: 'info',
    },
    {
      title: 'Blacklisted',
      value: String(blacklistedCount),
      iconName: 'ShieldX',
      subtitle: 'Restricted visitors',
      variant: 'destructive',
    },
  ];

  const adminVisitorActions: ActionGridItem[] = [
    {
      id: 'passes',
      name: 'All Passes',
      iconName: 'Filter',
      colorBg: 'bg-primary/10',
      colorIcon: '#6366f1',
      route: '/(resident)/visitor/admin/community-passes',
    },
    {
      id: 'walkins',
      name: 'Master Walk-Ins',
      iconName: 'ShieldAlert',
      colorBg: 'bg-amber-500/10',
      colorIcon: '#f59e0b',
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500',
      route: '/(resident)/visitor/admin/walk-in-console',
    },
    {
      id: 'blacklist',
      name: 'Blacklist',
      iconName: 'ShieldX',
      colorBg: 'bg-destructive/10',
      colorIcon: '#ef4444',
      badge: blacklistedCount > 0 ? blacklistedCount : undefined,
      badgeColor: 'bg-destructive',
      route: '/(resident)/visitor/admin/blacklist',
    },
    {
      id: 'logs',
      name: 'Audit Logs',
      iconName: 'History',
      colorBg: 'bg-slate-500/10',
      colorIcon: '#64748b',
      route: '/(resident)/visitor/admin-logs',
    },
  ];

  return (
    <ScreenShell
      title="Community Visitor Management"
      subtitle="Admin master security console & entry audit"
      iconName="ShieldCheck"
      loading={isLoading}
      error={error}
      onRetry={loadData}
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(resident)/visitor/admin-logs' as any)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full border border-border"
          accessibilityRole="button"
          accessibilityLabel="View Audit Logs"
        >
          <History size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">Audit Logs</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 gap-4 pb-20"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Analytics Card */}
        <VisitorAnalyticsCard analytics={analytics} />

        {/* Universal Admin KPIs 2x2 Grid */}
        <KPIDashboardStrip cards={adminKpis} />

        {/* Universal 3-Column ActionGrid */}
        <ActionGrid title="Quick Actions" items={adminVisitorActions} />

        {/* Canonical Section Header */}
        <SectionHeader
          title="Recent Activity"
          actionLabel="View All"
          onAction={() => router.push('/(resident)/visitor/admin/community-passes' as any)}
          className="px-0 bg-transparent dark:bg-transparent"
        />

        {/* List of Recent Passes using Reusable VisitorPassCard */}
        {communityPasses.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No Community Passes Recorded"
            description="No entry or exit logs have been recorded today."
            actionLabel="Create Pass"
            onAction={() => router.push('/(resident)/visitor/admin/create-pass' as any)}
          />
        ) : (
          <View className="gap-2.5">
            {communityPasses.slice(0, 3).map((pass: any) => (
              <VisitorPassCard
                key={pass._id}
                pass={pass}
                villaBadge={pass.villaName || pass.villaNumber || 'Community'}
                onPress={(p) => setSelectedPass(mapBackendPassToHistoryItem(p))}
                onShowQR={(p) => setSelectedPass(mapBackendPassToHistoryItem(p))}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <VisitorLogDetailsModal
        visible={Boolean(selectedPass)}
        pass={selectedPass}
        onClose={() => setSelectedPass(null)}
      />

      {/* Primary Action: Create Admin Pass FAB */}
      <FAB
        iconName="UserPlus"
        label="Admin Pass"
        onPress={() => router.push('/(resident)/visitor/admin/create-pass' as any)}
      />
    </ScreenShell>
  );
}
