import { useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchNotices, Notice } from '../store/noticeBoardSlice';

export interface HeroNoticeSlide {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  badgeBgHex: string;
  badgeTextHex: string;
  cardBgHex: string;
  iconName: string;
  route: string;
  isFallback?: boolean;
  priority?: string;
  isPinned?: boolean;
}

const FALLBACK_HERO_SLIDE: HeroNoticeSlide = {
  id: 'fallback-welcome',
  title: 'Welcome to Manage My Gate',
  description: 'Stay tuned for official community announcements, circulars, and gate updates.',
  badgeText: 'SECURITY GATE',
  badgeBgHex: 'rgba(255, 255, 255, 0.2)',
  badgeTextHex: '#ffffff',
  cardBgHex: '#047857', // Rich Emerald Green
  iconName: 'Megaphone',
  route: '/(resident)/notices/active-board',
  isFallback: true,
};

export const useHeroNotices = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notices, loading } = useSelector((state: RootState) => state.noticeBoard);
  const initialFetchRef = useRef(false);

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      dispatch(fetchNotices());
    }
  }, [dispatch]);

  const slides: HeroNoticeSlide[] = useMemo(() => {
    if (!notices || notices.length === 0) {
      return [FALLBACK_HERO_SLIDE];
    }

    // Sort notices: Pinned first, then Critical/Emergency, then High, then rest
    const sorted = [...notices].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const priorityScore = (p: string) => {
        if (p === 'Critical') return 4;
        if (p === 'High') return 3;
        if (p === 'Medium') return 2;
        return 1;
      };

      const scoreA = priorityScore(a.priority);
      const scoreB = priorityScore(b.priority);
      if (scoreA !== scoreB) return scoreB - scoreA;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted.map((notice: Notice) => {
      let badgeText = '📢 ANNOUNCEMENT';
      let badgeBgHex = 'rgba(56, 189, 248, 0.25)';
      let badgeTextHex = '#e0f2fe';
      let cardBgHex = '#0284c7'; // Rich Sky Blue
      let iconName = 'BellRing';

      if (notice.isPinned) {
        badgeText = '📌 PINNED NOTICE';
        badgeBgHex = 'rgba(251, 191, 36, 0.3)';
        badgeTextHex = '#fef3c7';
        cardBgHex = '#312e81'; // Indigo 900
        iconName = 'ShieldAlert';
      } else if (notice.priority === 'Critical' || notice.category === 'Emergency') {
        badgeText = '🚨 CRITICAL ALERT';
        badgeBgHex = 'rgba(244, 63, 94, 0.3)';
        badgeTextHex = '#ffe4e6';
        cardBgHex = '#881337'; // Rose 900
        iconName = 'AlertCircle';
      } else if (notice.priority === 'High' || notice.category === 'Maintenance') {
        badgeText = '⚠️ MAINTENANCE';
        badgeBgHex = 'rgba(245, 158, 11, 0.3)';
        badgeTextHex = '#fef3c7';
        cardBgHex = '#0f172a'; // Slate 900
        iconName = 'Wrench';
      } else if (notice.category === 'Events') {
        badgeText = '🎉 COMMUNITY EVENT';
        badgeBgHex = 'rgba(168, 85, 247, 0.3)';
        badgeTextHex = '#f3e8ff';
        cardBgHex = '#581c87'; // Purple 900
        iconName = 'Calendar';
      }

      return {
        id: notice._id,
        title: notice.title,
        description: notice.content || (notice as any).description || '',
        badgeText,
        badgeBgHex,
        badgeTextHex,
        cardBgHex,
        iconName,
        route: '/(resident)/notices/active-board',
        isPinned: notice.isPinned,
        priority: notice.priority,
      };
    });
  }, [notices]);

  return {
    slides,
    loading,
  };
};

export default useHeroNotices;
