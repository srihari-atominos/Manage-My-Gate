import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Download, ListChecks, CheckCircle, PenTool, Clock, Ban, Pin, AlertTriangle, AlertCircle, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { KPICard } from '@/components/ui/KPICard';

import { ActivityLogItem } from '@/components/data';
import { useNoticeBoard } from '@/src/features/noticeBoard/hooks/useNoticeBoard';
import { useNoticeSocket } from '@/src/features/noticeBoard/hooks/useNoticeSocket';


export default function NoticeDashboardScreen() {
  useNoticeSocket();
  const router = useRouter();
  const { dashboardStats, dashboardLoading, dashboardError, loadNoticeStats, setFilters } = useNoticeBoard();

  useEffect(() => {
    loadNoticeStats();
  }, []);

  const handleRefresh = useCallback(() => {
    loadNoticeStats();
  }, [loadNoticeStats]);



  const stats = dashboardStats?.kpis || {};

  const recentActivity = dashboardStats?.recentActivity || [];



  return (
    <ScreenShell title="Notice Board Dashboard">
      <View className="flex-1 bg-background">
        {dashboardError ? (
          <View className="m-4 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
            <Text className="text-destructive font-semibold">{dashboardError}</Text>
          </View>
        ) : null}

        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 pb-24"
          refreshControl={
            <RefreshControl refreshing={dashboardLoading && !!dashboardStats} onRefresh={handleRefresh} />
          }
        >
          {dashboardLoading && !dashboardStats ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : (
            <View className="gap-6">
              {/* Header section */}
              <View className="flex-row items-center justify-between flex-wrap gap-3">
                <View className="flex-1">
                  <Text className="text-2xl font-extrabold text-foreground">Management Overview</Text>
                </View>
              </View>

              {/* KPI Grid */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pb-2">
                <View className="w-40">
                  <KPICard
                    title="Active Notices"
                    value={String(stats.activeNotices || 0)}
                    iconName="CheckCircle"
                    iconColor="#16a34a"
                  />
                  <Text className="text-[10px] text-emerald-600 font-semibold mt-1 px-1">Published</Text>
                </View>
                <View className="w-40">
                  <KPICard
                    title="Drafts"
                    value={String(stats.draftNotices || 0)}
                    iconName="PenTool"
                    iconColor="#eab308"
                  />
                  <Text className="text-[10px] text-amber-500 font-semibold mt-1 px-1">Unpublished</Text>
                </View>

                <View className="w-40">
                  <KPICard
                    title="Pinned"
                    value={String(stats.pinnedNotices || 0)}
                    iconName="Pin"
                    iconColor="#4f46e5"
                  />
                  <Text className="text-[10px] text-indigo-600 font-semibold mt-1 px-1">Featured</Text>
                </View>
                <View className="w-40">
                  <KPICard
                    title="Urgent & Critical"
                    value={String(stats.urgentNotices || 0)}
                    iconName="AlertTriangle"
                    iconColor="#dc2626"
                  />
                  <Text className="text-[10px] text-red-600 font-semibold mt-1 px-1">Priority High+</Text>
                </View>
              </ScrollView>

              {/* Quick Navigation Grid */}
              <View className="bg-card border border-border rounded-2xl p-3 gap-2 mt-2">
                <Text variant="small" className="text-muted-foreground uppercase font-bold text-[10px]">
                  Quick Navigation
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => router.push('/(resident)/notices/dashboard')}
                    activeOpacity={0.8}
                    className="flex-1 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl items-center gap-1"
                  >
                    <Info size={18} className="text-blue-600 dark:text-blue-400" />
                    <Text className="text-xs font-bold text-blue-600 dark:text-blue-400 text-center">Dashboard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/(resident)/notices')}
                    activeOpacity={0.8}
                    className="flex-1 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl items-center gap-1"
                  >
                    <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center">Active</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setFilters({}); // Clear filters before going to manage
                      router.push('/(resident)/notices/manage');
                    }}
                    activeOpacity={0.8}
                    className="flex-1 bg-primary/10 border border-primary/20 p-2.5 rounded-xl items-center gap-1"
                  >
                    <ListChecks size={18} className="text-primary" />
                    <Text className="text-xs font-bold text-primary text-center">Manage</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/(resident)/notices/polls')}
                    activeOpacity={0.8}
                    className="flex-1 bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl items-center gap-1"
                  >
                    <PenTool size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400 text-center">Polls</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Live Activity Log */}
              <View className="bg-card border border-border rounded-2xl p-4 shadow-xs mt-2">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-extrabold text-foreground">Live Activity Log</Text>
                  <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                    <View className="size-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[10px] font-extrabold text-emerald-600 tracking-wider">LIVE</Text>
                  </View>
                </View>

                {recentActivity.length > 0 ? (
                  recentActivity.map((activity: any, index: number) => (
                    <ActivityLogItem
                      key={activity.id || index}
                      title={activity.title}
                      category={activity.category}
                      priority={activity.priority}
                      status={activity.status}
                      createdAt={activity.createdAt}
                      isLastItem={index === recentActivity.length - 1}
                    />
                  ))
                ) : (
                  <View className="items-center justify-center py-6">
                    <Text className="text-sm font-medium text-muted-foreground">No recent activity</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenShell>
  );
}
