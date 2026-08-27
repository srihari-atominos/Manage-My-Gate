import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/text';

interface CategoryBarChartProps {
  categories: Record<string, number>;
  containerHeight?: number | string;
}

export const CategoryBarChart = ({ categories, containerHeight = 128 }: CategoryBarChartProps) => {
  const categoryValues = Object.values(categories);
  const maxCategoryCount = Math.max(...categoryValues, 1);

  return (
    <View className="flex-row items-end gap-2" style={{ height: containerHeight as any }}>
      {Object.entries(categories).map(([category, count]) => {
        const heightPercent = Math.min(100, Math.max(10, (count / maxCategoryCount) * 100));
        return (
          <View key={category} className="flex-1 items-center justify-end h-full">
            <View
              className="w-full bg-primary/20 rounded-t-sm"
              style={{ height: `${heightPercent}%` }}
            >
              <View
                className="absolute bottom-0 w-full bg-primary rounded-t-sm"
                style={{ height: '100%', maxHeight: 4 }}
              />
            </View>
            <Text
              className="text-[9px] font-semibold text-muted-foreground mt-2 text-center"
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
