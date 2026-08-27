import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/lib/utils';

export interface FilterPillsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  className?: string;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  className,
}) => {
  return (
    <View className={cn('py-2', className)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="flex-row"
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category;

          return (
            <TouchableOpacity
              key={category}
              onPress={() => onSelectCategory(category)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filter by ${category}`}
              className={cn(
                'me-2.5 min-h-[48px] items-center justify-center rounded-full px-5 border py-2.5 transition-colors',
                isSelected
                  ? 'bg-primary border-primary shadow-sm'
                  : 'bg-card border-border hover:bg-muted'
              )}
              style={{ minWidth: 48 }}
            >
              <Text
                className={cn(
                  'text-xs font-semibold tracking-wide',
                  isSelected ? 'text-primary-foreground font-bold' : 'text-foreground'
                )}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
