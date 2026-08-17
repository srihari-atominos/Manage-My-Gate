import React from 'react';
import { View } from 'react-native';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';

export const NoticeBoardLoadingSkeleton = () => {
  return (
    <View className="px-4 py-2 gap-4">
      {[1, 2, 3].map((key) => (
        <View key={key} className="bg-card border border-border p-4 rounded-xl">
          <View className="flex-row items-center gap-3 mb-3">
            <SkeletonLoader variant="circular" width={40} height={40} />
            <View className="flex-1 gap-2">
              <SkeletonLoader variant="text" width="60%" />
              <SkeletonLoader variant="text" width="40%" />
            </View>
          </View>
          <View className="gap-2 mt-2">
            <SkeletonLoader variant="text" width="100%" />
            <SkeletonLoader variant="text" width="90%" />
            <SkeletonLoader variant="text" width="75%" />
          </View>
        </View>
      ))}
    </View>
  );
};

export default NoticeBoardLoadingSkeleton;
