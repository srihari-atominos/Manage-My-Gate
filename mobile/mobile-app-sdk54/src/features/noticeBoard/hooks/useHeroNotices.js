import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const PRIORITY_ORDER = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};

const fallbackSlide = {
  id: 'fallback-notice',
  title: 'Welcome to your Community!',
  description: 'Stay updated with active announcements and alerts from your community management here.',
  badgeText: 'NOTICE',
  badgeBgHex: 'rgba(255, 255, 255, 0.2)',
  badgeTextHex: '#ffffff',
  cardBgHex: '#0f766e', // Teal color
  iconName: 'Megaphone',
  route: '/(resident)/notices',
  isFallback: true,
};

const mapNoticeToSlide = (notice) => {
  let iconName = 'Megaphone';
  let badgeBgHex = 'rgba(255, 255, 255, 0.2)';
  let cardBgHex = '#0f766e'; // Default Teal

  if (notice.category === 'Emergency') {
    iconName = 'ShieldAlert';
    badgeBgHex = 'rgba(220, 38, 38, 0.2)';
    cardBgHex = '#be123c'; // Rose red
  } else if (notice.category === 'Maintenance') {
    iconName = 'Wrench';
    badgeBgHex = 'rgba(234, 88, 12, 0.2)';
    cardBgHex = '#c2410c'; // Warm orange
  } else if (notice.category === 'Events') {
    iconName = 'Calendar';
    badgeBgHex = 'rgba(37, 99, 235, 0.2)';
    cardBgHex = '#1d4ed8'; // Royal blue
  } else if (notice.category === 'Meetings') {
    iconName = 'Building2';
    badgeBgHex = 'rgba(147, 51, 234, 0.2)';
    cardBgHex = '#7e22ce'; // Purple
  }

  return {
    id: notice._id,
    title: notice.title,
    description: notice.description,
    badgeText: notice.category.toUpperCase(),
    badgeBgHex,
    badgeTextHex: '#ffffff',
    cardBgHex,
    iconName,
    route: `/(resident)/notices/${notice._id}`,
    isFallback: false,
    priority: notice.priority,
    isPinned: notice.isPinned,
  };
};

/**
 * Notice Board Dashboard Banner Hook
 * Filters and sorts active notices for hero display (Pinned first ➔ Priority levels ➔ Chronological recency)
 * Maps them directly to slides expected by the global HeroBanner UI component.
 */
export function useHeroNotices() {
  const notices = useSelector((state) => state.noticeBoard.notices);

  const heroNotices = useMemo(() => {
    if (!notices || !Array.isArray(notices)) return [];

    return notices
      .filter((notice) => notice.status === 'Published')
      .sort((a, b) => {
        // Pinned notices take absolute priority
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // Priority levels next
        const aPriority = PRIORITY_ORDER[a.priority] || 5;
        const bPriority = PRIORITY_ORDER[b.priority] || 5;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Recency last (newest first)
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [notices]);

  const slides = useMemo(() => {
    if (!heroNotices || heroNotices.length === 0) {
      return [fallbackSlide];
    }
    return heroNotices.map(mapNoticeToSlide);
  }, [heroNotices]);

  return {
    heroNotices,
    slides,
  };
}

export default useHeroNotices;
