import React, { memo } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { cn } from '../../lib/utils';
import { EmptyState } from '../feedback/EmptyState';
import { LayoutGrid } from 'lucide-react-native';

export interface GridColumn<T> {
  key: string;
  header: string;
  flex?: number;
  width?: number;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface OptimizedDataGridProps<T> {
  data: T[];
  columns: GridColumn<T>[];
  keyExtractor: (item: T, index: number) => string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  emptyMessage?: string;
  className?: string;
}

const OptimizedDataGridComponent = <T extends any>({
  data,
  columns,
  keyExtractor,
  onRefresh,
  refreshing = false,
  onEndReached,
  emptyMessage = 'No data available',
  className,
}: OptimizedDataGridProps<T>) => {
  const renderHeader = () => (
    <View className="flex-row border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
      {columns.map((col) => (
        <View
          key={col.key}
          style={{ flex: col.flex || (col.width ? undefined : 1), width: col.width }}
        >
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
            {col.header}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderItem = ({ item, index }: { item: T; index: number }) => (
    <View className="flex-row items-center border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      {columns.map((col) => (
        <View
          key={col.key}
          style={{ flex: col.flex || (col.width ? undefined : 1), width: col.width }}
        >
          {col.render ? (
            col.render(item, index)
          ) : (
            <Text
              className="text-sm text-slate-900 dark:text-slate-100"
              numberOfLines={1}
            >
              {String((item as any)[col.key] || '')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View className={cn('flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800', className)}>
      {renderHeader()}
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon={LayoutGrid}
            title="No records"
            description={emptyMessage}
          />
        }
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        initialNumToRender={10}
        windowSize={5}
      />
    </View>
  );
};

export const OptimizedDataGrid = memo(OptimizedDataGridComponent) as typeof OptimizedDataGridComponent;
