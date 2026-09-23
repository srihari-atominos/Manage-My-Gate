import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  FileText,
  Users,
  Megaphone,
  CheckCircle,
  BarChart3,
  PenTool,
  AlertTriangle,
} from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { type KPICardProps } from '@/components/ui/KPICard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ListCard } from '@/components/ui/ListCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { type StatusVariant } from '@/components/ui/StatusBadge';
import { CommunityEngagementTypeSheet } from '../components/CommunityEngagementTypeSheet';
import { useCommunityEngagementDashboard } from '../hooks/useCommunityEngagementDashboard';
import { EngagementContentType } from '../types/communityEngagement.types';

export function CommunityEngagementDashboardScreen() {
  const router = useRouter();
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const { kpis, recentEngagements, loading, isRefreshing, error, refreshDashboard } =
    useCommunityEngagementDashboard();

  const handleSelectType = (type: EngagementContentType) => {
    setTypeSheetVisible(false);
    router.push({
      pathname: '/(resident)/community-engagement/create' as any,
      params: { type },
    });
  };

  const kpiCards: KPICardProps[] = useMemo(
    () => [
      {
        title: 'Active Notices',
        value: kpis.activeNotices,
        variant: 'success',
        iconName: 'CheckCircle',
        subtitle: 'Live circulars',
        onPress: () =>
          router.push({
            pathname: '/(resident)/community-engagement/ledger' as any,
            params: { tab: 'NOTICES', status: 'Published' },
          }),
      },
      {
        title: 'Active Polls',
        value: kpis.activePolls,
        variant: 'info',
        iconName: 'BarChart3',
        subtitle: 'Open for vote',
        onPress: () =>
          router.push({
            pathname: '/(resident)/community-engagement/ledger' as any,
            params: { tab: 'POLLS', status: 'Active' },
          }),
      },
      {
        title: 'Draft Notices',
        value: kpis.draftNotices,
        variant: 'warning',
        iconName: 'PenTool',
        subtitle: 'Unpublished drafts',
        onPress: () =>
          router.push({
            pathname: '/(resident)/community-engagement/ledger' as any,
            params: { tab: 'NOTICES', status: 'Draft' },
          }),
      },
      {
        title: 'Urgent Notices',
        value: kpis.urgentNotices,
        variant: 'destructive',
        iconName: 'AlertTriangle',
        subtitle: 'High & Critical priority',
        onPress: () =>
          router.push({
            pathname: '/(resident)/community-engagement/ledger' as any,
            params: { tab: 'NOTICES', priority: 'Critical' },
          }),
      },
    ],
    [kpis, router]
  );

  const getStatusBadgeVariant = (status: string, priority?: string): StatusVariant => {
    if (priority === 'Critical' || priority === 'High') return 'danger';
    const s = (status || '').toUpperCase();
    if (s === 'PUBLISHED' || s === 'ACTIVE') return 'success';
    if (s === 'DRAFT') return 'warning';
    if (s === 'SCHEDULED') return 'info';
    return 'neutral';
  };

  return (
    <ScreenShell
      title="Community Engagement"
      subtitle="Broadcast notices, alerts & resident polls"
      iconName="Megaphone"
      showBackButton={true}
      headerRight={
        <Button
          variant="default"
          size="sm"
          onPress={() => setTypeSheetVisible(true)}
          className="flex-row items-center px-3"
          accessibilityRole="button"
          accessibilityLabel="Create Engagement"
        >
          <Text className="text-primary-foreground font-semibold text-xs">+ Create Engagement</Text>
        </Button>
      }
      loading={loading && !isRefreshing}
      error={error}
      onRetry={refreshDashboard}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 space-y-5 pb-20"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshDashboard} />
        }
      >
        {/* 1. 4 KPI Metrics Grid (2x2) */}
        <View className="mb-2">
          <KPIDashboardStrip
            cards={kpiCards}
            loading={loading && !isRefreshing}
            layout="grid2x2"
          />
        </View>

        {/* 2. Quick Actions Row */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push('/(resident)/community-engagement/ledger' as any)}
            className="flex-1 bg-card border border-border p-4 rounded-xl flex-row items-center active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Manage Engagements"
          >
            <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center me-3">
              <FileText size={20} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Manage Engagements</Text>
              <Text className="text-xs text-muted-foreground">Audit, edit, or close</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(resident)/notices/active-board' as any)}
            className="flex-1 bg-card border border-border p-4 rounded-xl flex-row items-center active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel="Resident View"
          >
            <View className="w-10 h-10 rounded-lg bg-emerald-500/10 items-center justify-center me-3">
              <Users size={20} className="text-emerald-500" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Resident View</Text>
              <Text className="text-xs text-muted-foreground">Circulars & live polls</Text>
            </View>
          </Pressable>
        </View>

        {/* 3. Recent Activity Section (Strict 3-Item Limit) */}
        <View className="space-y-3">
          <SectionHeader
            title="Recent Activity"
            actionLabel="See All"
            onAction={() => router.push('/(resident)/community-engagement/ledger' as any)}
          />

          {recentEngagements.length === 0 && !loading ? (
            <EmptyState
              icon={Megaphone}
              title="No Recent Activity"
              description="Create notices or polls to communicate and engage with community residents."
              actionLabel="+ Create Engagement"
              onAction={() => setTypeSheetVisible(true)}
              className="py-6"
            />
          ) : (
            <View className="space-y-2">
              {recentEngagements.map((item) => (
                <ListCard
                  key={`${item.type}-${item.id}`}
                  title={item.title}
                  subtitle={item.subtitle}
                  leftIcon={item.type === 'NOTICE' ? 'Megaphone' : 'BarChart3'}
                  leftIconBgColor={item.type === 'NOTICE' ? 'bg-primary/10' : 'bg-sky-500/10'}
                  leftIconColor={item.type === 'NOTICE' ? '#6366f1' : '#0ea5e9'}
                  status={{
                    label: item.status,
                    variant: getStatusBadgeVariant(item.status, item.priority),
                  }}
                  secondaryBadge={{
                    label: item.type === 'NOTICE' ? 'Notice' : 'Poll',
                    variant: item.type === 'NOTICE' ? 'info' : 'gold',
                  }}
                  timestamp={item.createdAt}
                  showChevron={true}
                  onPress={() => router.push(item.route as any)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Unified Creation Archetype Selection Sheet */}
      <CommunityEngagementTypeSheet
        visible={typeSheetVisible}
        onClose={() => setTypeSheetVisible(false)}
        onSelectType={handleSelectType}
      />
    </ScreenShell>
  );
}

export default CommunityEngagementDashboardScreen;
