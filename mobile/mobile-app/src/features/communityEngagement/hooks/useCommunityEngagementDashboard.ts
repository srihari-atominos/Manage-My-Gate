import { useState, useEffect, useCallback } from 'react';
import * as noticeBoardService from '@/src/features/noticeBoard/services/noticeBoardService';
import { pollApi } from '@/src/features/poll/services/pollApi';

export interface RecentEngagementItem {
  id: string;
  type: 'NOTICE' | 'POLL';
  title: string;
  subtitle: string;
  status: string;
  priority?: string;
  createdAt: string;
  route: string;
}

export interface DashboardKPIs {
  activeNotices: number;
  activePolls: number;
  draftNotices: number;
  urgentNotices: number;
}

export function useCommunityEngagementDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    activeNotices: 0,
    activePolls: 0,
    draftNotices: 0,
    urgentNotices: 0,
  });
  const [recentEngagements, setRecentEngagements] = useState<RecentEngagementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Parallel fetch: Notice stats, Active polls count, Recent notices, Recent polls
      const [noticeStatsRes, activePollsRes, recentNoticesRes, recentPollsRes] =
        await Promise.allSettled([
          noticeBoardService.getNoticeStats(),
          pollApi.getActivePolls({ limit: 1 }),
          noticeBoardService.getNotices({ limit: 3, sort: 'latest', status: 'Published' }),
          pollApi.getActivePolls({ limit: 3, sort: 'latest' }),
        ]);

      // 1. Process KPIs
      let activeNotices = 0;
      let draftNotices = 0;
      let urgentNotices = 0;
      let activePolls = 0;

      if (noticeStatsRes.status === 'fulfilled' && noticeStatsRes.value?.data) {
        const statsData = noticeStatsRes.value.data?.data || noticeStatsRes.value.data;
        const kpiData = statsData?.kpis || {};
        activeNotices = kpiData.activeNotices ?? 0;
        draftNotices = kpiData.draftNotices ?? 0;
        urgentNotices = kpiData.urgentNotices ?? 0;
      }

      if (activePollsRes.status === 'fulfilled' && activePollsRes.value?.data) {
        const pollsData = activePollsRes.value.data?.data || activePollsRes.value.data;
        activePolls = pollsData?.pagination?.total ?? (Array.isArray(pollsData?.polls) ? pollsData.polls.length : 0);
      }

      setKpis({
        activeNotices,
        activePolls,
        draftNotices,
        urgentNotices,
      });

      // 2. Process & merge recent activities
      const recentList: RecentEngagementItem[] = [];

      if (recentNoticesRes.status === 'fulfilled' && recentNoticesRes.value?.data) {
        const noticePayload = recentNoticesRes.value.data?.data || recentNoticesRes.value.data;
        const rawNotices = Array.isArray(noticePayload?.notices)
          ? noticePayload.notices
          : Array.isArray(noticePayload)
          ? noticePayload
          : [];

        rawNotices.forEach((n: any) => {
          if (!n?._id) return;
          recentList.push({
            id: n._id,
            type: 'NOTICE',
            title: n.title || 'Untitled Notice',
            subtitle: n.category ? `${n.category} Notice` : 'Notice',
            status: n.status || 'Published',
            priority: n.priority,
            createdAt: n.createdAt || new Date().toISOString(),
            route: `/(resident)/notices/${n._id}`,
          });
        });
      }

      if (recentPollsRes.status === 'fulfilled' && recentPollsRes.value?.data) {
        const pollPayload = recentPollsRes.value.data?.data || recentPollsRes.value.data;
        const rawPolls = Array.isArray(pollPayload?.polls)
          ? pollPayload.polls
          : Array.isArray(pollPayload)
          ? pollPayload
          : [];

        rawPolls.forEach((p: any) => {
          if (!p?._id) return;
          recentList.push({
            id: p._id,
            type: 'POLL',
            title: p.question || 'Untitled Poll',
            subtitle: `${p.options?.length || 0} Options`,
            status: p.status || 'Active',
            createdAt: p.createdAt || new Date().toISOString(),
            route: `/(resident)/polls/${p._id}`,
          });
        });
      }

      // Sort descending by creation date
      recentList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Strict enforcement of Rule: Maximum 3 items on dashboard preview
      setRecentEngagements(recentList.slice(0, 3));
    } catch (err: any) {
      console.error('[CommunityEngagementDashboard] Failed to fetch dashboard data:', err);
      setError(err?.message || 'Failed to load community engagement dashboard');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshDashboard = useCallback(() => {
    return fetchDashboardData(true);
  }, [fetchDashboardData]);

  return {
    kpis,
    recentEngagements,
    loading,
    isRefreshing,
    error,
    refreshDashboard,
  };
}
