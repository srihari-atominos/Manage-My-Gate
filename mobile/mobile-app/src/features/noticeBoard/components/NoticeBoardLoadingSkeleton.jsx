import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components';

export const NoticeBoardLoadingSkeleton = () => {
  return (
    <View className="px-4 py-2 gap-4">
      {[1, 2, 3].map((key) => (
        <View key={key} className="bg-card border border-border p-4 rounded-xl">
          <View className="flex-row items-center gap-3 mb-3">
            <Skeleton variant="circle" width={40} height={40} />
            <View className="flex-1 gap-2">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </View>
          </View>
          <View className="gap-2 mt-2">
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="75%" />
          </View>
        </View>
      ))}
    </View>
  );
};

export default NoticeBoardLoadingSkeleton;
