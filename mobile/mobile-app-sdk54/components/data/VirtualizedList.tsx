import React from 'react';
import { FlatList, FlatListProps, View, Text } from 'react-native';
import { cn } from '../../lib/utils';
import { ProgressLoader } from '../feedback/ProgressLoader';

export interface VirtualizedListProps<T> extends Omit<FlatListProps<T>, 'ListEmptyComponent'> {
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const VirtualizedList = <T extends any>({
  data,
  loading = false,
  emptyMessage = 'No data available',
  className,
  ...props
}: VirtualizedListProps<T>) => {
  const EmptyComponent = () => (
    <View className="flex-1 items-center justify-center p-8 min-h-[200px]">
      <Text className="text-center text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </Text>
    </View>
  );

  if (loading && data.length === 0) {
    return (
      <View className={cn('flex-1 items-center justify-center min-h-[200px]', className)}>
        <ProgressLoader size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      className={cn('flex-1', className)}
      ListEmptyComponent={EmptyComponent}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      {...props}
    />
  );
};
