import React, { useCallback } from 'react';
import { View } from 'react-native';
import { NoticeCard } from './NoticeCard';
import { useTranslation } from '@/src/utils/i18n';

/**
 * Memoized NoticeCard Wrapper
 * Prevents redundant re-renders of items in the PaginatedList by keeping handlers stable,
 * while ensuring proper re-renders when language switches.
 */
export const MemoizedNoticeCard = React.memo(
  ({ notice, onPress, onBookmarkToggle, isAdmin = false, language: propLanguage }) => {
    const { language: currentLang } = useTranslation();
    const activeLang = propLanguage || currentLang;

    const handlePress = useCallback(() => {
      onPress?.(notice);
    }, [notice, onPress]);

    const handleBookmark = useCallback(
      (id, isBookmarked) => {
        onBookmarkToggle?.(id, isBookmarked);
      },
      [onBookmarkToggle]
    );

    return (
      <View className="px-4">
        <NoticeCard
          key={`${notice?._id || notice?.id || 'notice'}-${activeLang}`}
          notice={notice}
          onPress={handlePress}
          onBookmarkToggle={handleBookmark}
          isAdmin={isAdmin}
        />
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.notice === nextProps.notice &&
      prevProps.language === nextProps.language &&
      prevProps.isAdmin === nextProps.isAdmin &&
      prevProps.onPress === nextProps.onPress &&
      prevProps.onBookmarkToggle === nextProps.onBookmarkToggle
    );
  }
);

MemoizedNoticeCard.displayName = 'MemoizedNoticeCard';
