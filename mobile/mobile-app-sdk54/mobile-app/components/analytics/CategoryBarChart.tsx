import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type CategoryData =
  | Record<string, number>
  | Array<{ category: string; count: number }>;

export interface CategoryBarChartProps {
  categories: CategoryData;
  containerHeight?: number | string;
  className?: string;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  categories,
  containerHeight = 120,
  className,
}) => {
  // Normalize data into [category, count] pairs
  const normalizedData: Array<{ category: string; count: number }> = React.useMemo(() => {
    if (!categories) return [];
    if (Array.isArray(categories)) {
      return categories.map((item) => ({
        category: item.category || 'Other',
        count: typeof item.count === 'number' ? item.count : Number(item.count) || 0,
      }));
    }
    return Object.entries(categories).map(([category, count]) => ({
      category,
      count: typeof count === 'number' ? count : Number(count) || 0,
    }));
  }, [categories]);

  const maxCategoryCount = Math.max(...normalizedData.map((d) => d.count), 1);

  if (normalizedData.length === 0) {
    return (
      <View
        className={cn('items-center justify-center py-6', className)}
        style={{ height: typeof containerHeight === 'number' ? containerHeight : undefined }}
      >
        <Text className="text-xs text-muted-foreground">No category data available</Text>
      </View>
    );
  }

  return (
    <View
      className={cn('flex-row items-end gap-x-2 w-full', className)}
      style={{ height: typeof containerHeight === 'number' ? containerHeight : undefined }}
    >
      {normalizedData.map(({ category, count }) => {
        const heightPercent = Math.min(100, Math.max(12, (count / maxCategoryCount) * 100));
        return (
          <View key={category} className="flex-1 items-center justify-end h-full">
            <Text className="text-[10px] font-bold text-foreground mb-1">
              {count}
            </Text>
            <View
              className="w-full bg-primary/20 rounded-t-md justify-end overflow-hidden"
              style={{ height: `${heightPercent}%` }}
            >
              <View className="w-full bg-primary rounded-t-md h-full" />
            </View>
            <Text
              className="text-[10px] font-semibold text-muted-foreground mt-2 text-center"
              numberOfLines={1}
            >
              {category}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default CategoryBarChart;
