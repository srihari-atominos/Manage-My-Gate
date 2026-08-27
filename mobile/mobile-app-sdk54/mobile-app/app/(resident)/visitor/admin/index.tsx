import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/button';
import { VisitorAnalyticsCard } from '@/src/features/visitor/components/admin/VisitorAnalyticsCard';
import { VisitorPassCard } from '@/src/features/visitor/components/VisitorPassCard';
import { VisitorLogDetailsModal } from '@/src/features/visitor/components/history/VisitorLogDetailsModal';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { mapBackendPassToHistoryItem } from '@/src/features/visitor/utils/mapBackendPassToHistoryItem';
import { UserPlus, ShieldAlert, History, Filter, BarChart2, ShieldX } from 'lucide-react-native';

export default function AdminVisitorDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  const {
    communityPasses,
    analytics,
    loadCommunityPasses,
    loadAnalytics,
  } = useAdminVisitor();

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

  return (
    <ScreenShell
      title="Community Visitor Management"
      subtitle="Admin master security console & entry audit"
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(resident)/visitor/admin/create-pass' as any)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-primary px-3 py-1.5 rounded-full"
        >
          <UserPlus size={14} color="#fff" />
          <Text className="text-xs font-bold text-primary-foreground">Admin Pass</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 gap-4 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Analytics Card */}
        <VisitorAnalyticsCard analytics={analytics} />

        {/* Admin KPIs Grid */}
        <View className="flex-row gap-3">
          <KPICard
            title="Inside Now"
            value={String(activeVisitorsCount)}
            iconName="ShieldCheck"
            iconColor="#16a34a"
            trend={{ direction: 'up', value: 'Live' }}
          />
          <KPICard
            title="Pending Gate"
            value={String(pendingCount)}
            iconName="Clock"
            iconColor="#ea580c"
            trend={{ direction: pendingCount > 0 ? 'down' : 'up', value: pendingCount > 0 ? 'Needs Action' : 'Clear' }}
          />
        </View>

        {/* Admin Quick Action Navigation Grid */}
        <View className="bg-card border border-border rounded-2xl p-3 gap-2">
          <Text variant="small" className="text-muted-foreground uppercase font-bold text-[10px]">
            Admin Security Controls
          </Text>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push('/(resident)/visitor/admin/community-passes' as any)}
              activeOpacity={0.8}
              className="flex-1 bg-primary/10 border border-primary/20 p-3 rounded-xl items-center gap-1"
            >
              <Filter size={18} className="text-primary" />
              <Text className="text-xs font-bold text-primary text-center">All Passes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(resident)/visitor/admin/walk-in-console' as any)}
              activeOpacity={0.8}
              className="flex-1 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl items-center gap-1"
            >
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 text-center">
                Master Walk-Ins ({pendingCount})
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push('/(resident)/visitor/admin/blacklist' as any)}
              activeOpacity={0.8}
              className="flex-1 bg-destructive/10 border border-destructive/20 p-3 rounded-xl items-center gap-1"
            >
              <ShieldX size={18} className="text-destructive" />
              <Text className="text-xs font-bold text-destructive text-center">
                Blacklist ({blacklistedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(resident)/visitor/admin-logs' as any)}
              activeOpacity={0.8}
              className="flex-1 bg-muted border border-border p-3 rounded-xl items-center gap-1"
            >
              <History size={18} className="text-foreground" />
              <Text className="text-xs font-bold text-foreground text-center">Audit Logs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Community Passes Header */}
        <View className="flex-row items-center justify-between pt-1">
          <Text variant="h3" className="font-bold text-foreground">
            Recent Community Passes
          </Text>
          <TouchableOpacity onPress={() => router.push('/(resident)/visitor/admin/community-passes' as any)}>
            <Text className="text-xs font-semibold text-primary">View All</Text>
          </TouchableOpacity>
        </View>

        {/* List of Recent Passes using Reusable VisitorPassCard */}
        {communityPasses.length === 0 ? (
          <View className="p-6 bg-card border border-border rounded-2xl items-center justify-center gap-2">
            <Text className="text-sm font-semibold text-muted-foreground text-center">
              No Community Passes Recorded
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {communityPasses.slice(0, 5).map((pass: any) => (
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
    </ScreenShell>
  );
}
