import React, { useCallback } from 'react';
import { View } from 'react-native';
import { NoticeCard } from './NoticeCard';

/**
 * Memoized NoticeCard Wrapper
 * Prevents redundant re-renders of items in the PaginatedList by keeping handlers stable.
 */
export const MemoizedNoticeCard = React.memo(({ notice, onPress, onBookmarkToggle }) => {
  const handlePress = useCallback(() => {
    onPress(notice);
  }, [notice, onPress]);

  const handleBookmark = useCallback((id, isBookmarked) => {
    onBookmarkToggle(id, isBookmarked);
  }, [onBookmarkToggle]);

  return (
    <View className="mb-3 px-4">
      <NoticeCard
        notice={notice}
        onPress={handlePress}
        onBookmarkToggle={handleBookmark}
        isAdmin={false}
      />
    </View>
  );
});

MemoizedNoticeCard.displayName = 'MemoizedNoticeCard';
