import React, { useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { KPICard } from '@/components/ui/KPICard';
import { VisitorAnalyticsCard } from '@/src/features/visitor/components/admin/VisitorAnalyticsCard';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';

export default function AdminVisitorAnalyticsScreen() {
  const { analytics, status, loadAnalytics } = useAdminVisitor();

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <ScreenShell title="Gate Visitor Analytics" subtitle="Check-in trends, traffic hours & gate metrics">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 gap-4 pb-8"
        refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={loadAnalytics} />}
      >
        <VisitorAnalyticsCard analytics={analytics} />

        <View className="bg-card border border-border rounded-2xl p-4 gap-3">
          <Text className="text-sm font-bold text-foreground">Pass Type Distribution</Text>
          {analytics?.categoryDistribution?.map((cat: any) => (
            <View key={cat.category} className="flex-row items-center justify-between py-1 border-b border-border/40">
              <Text className="text-xs font-semibold text-muted-foreground">{cat.category}</Text>
              <Text className="text-xs font-extrabold text-foreground">{cat.count} Passes</Text>
            </View>
          )) || (
            <View className="py-2">
              <Text className="text-xs text-muted-foreground">Guest: 45% • Cab: 30% • Delivery: 15% • Service: 10%</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
