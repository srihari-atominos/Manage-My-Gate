import React, { useCallback } from 'react';
import { NoticeCategoryChip } from './NoticeCategoryChip';

/**
 * Memoized CategoryChip Wrapper
 */
export const MemoizedCategoryChip = React.memo(({ category, selected, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(category);
  }, [category, onPress]);

  return (
    <NoticeCategoryChip
      category={category}
      selected={selected}
      onPress={handlePress}
    />
  );
});

MemoizedCategoryChip.displayName = 'MemoizedCategoryChip';
