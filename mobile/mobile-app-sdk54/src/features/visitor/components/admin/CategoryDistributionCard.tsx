import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { CategoryBarChart } from '@/components/analytics/CategoryBarChart';
import { Layers } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface CategoryItem {
  category: string;
  count: number;
}

export interface CategoryDistributionCardProps {
  categories?: CategoryItem[] | Record<string, number>;
  className?: string;
}

export const CategoryDistributionCard: React.FC<CategoryDistributionCardProps> = ({
  categories,
  className,
}) => {
  // Normalize input data
  const normalizedList: CategoryItem[] = useMemo(() => {
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

  const totalPasses = useMemo(() => {
    return normalizedList.reduce((acc, curr) => acc + curr.count, 0);
  }, [normalizedList]);

  return (
    <View className={cn('bg-card border border-border rounded-2xl p-4 gap-3.5 shadow-xs', className)}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border/60 pb-3">
        <View className="flex-row items-center gap-2">
          <View className="size-8 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
            <Layers size={16} className="text-primary" />
          </View>
          <Text className="text-sm font-bold text-foreground">Pass Type Distribution</Text>
        </View>

        <View className="bg-muted/50 px-2.5 py-1 rounded-full border border-border/40">
          <Text className="text-[11px] font-bold text-muted-foreground">
            {totalPasses} Total Passes
          </Text>
        </View>
      </View>

      {/* Visual Bar Chart */}
      <CategoryBarChart categories={normalizedList} containerHeight={100} />

      {/* Itemized Category Breakdown List */}
      <View className="gap-2 pt-2 border-t border-border/40">
        {normalizedList.length === 0 ? (
          <View className="py-2 items-center">
            <Text className="text-xs text-muted-foreground">No pass distribution records</Text>
          </View>
        ) : (
          normalizedList.map((item) => {
            const percentage = totalPasses > 0 ? Math.round((item.count / totalPasses) * 100) : 0;
            return (
              <View key={item.category} className="gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-foreground">
                    {item.category}
                  </Text>
                  <Text className="text-xs font-extrabold text-foreground">
                    {item.count} <Text className="text-[10px] font-normal text-muted-foreground">({percentage}%)</Text>
                  </Text>
                </View>

                {/* Progress bar line */}
                <View className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, Math.max(4, percentage))}%` }}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

export default CategoryDistributionCard;
