import * as React from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface SortOption {
  label: string;
  value: string;
}

const searchFilterBarVariants = cva('w-full flex-col px-4 py-2', {
  variants: {
    variant: {
      default: '',
      bordered: 'border-b border-border',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const filterButtonVariants = cva(
  'h-10 w-10 rounded-lg bg-muted items-center justify-center relative shrink-0 active:opacity-80 active:bg-accent',
  {
    variants: {
      hasActiveFilter: {
        true: 'bg-muted border border-primary/30',
        false: 'bg-muted',
      },
    },
    defaultVariants: {
      hasActiveFilter: false,
    },
  }
);

export interface SearchFilterBarProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof searchFilterBarVariants> {
  searchValue: string;
  onSearchChange: (text: string) => void;
  searchPlaceholder?: string; // default: 'Search...'
  onFilterPress?: () => void; // opens filter bottom sheet
  activeFilterCount?: number; // badge count on filter button
  sortOptions?: SortOption[];
  onSortChange?: (value: string) => void;
  currentSort?: string;
  className?: string;
}

export const SearchFilterBar = React.forwardRef<View, SearchFilterBarProps>(
  (
    {
      searchValue,
      onSearchChange,
      searchPlaceholder = 'Search...',
      onFilterPress,
      activeFilterCount = 0,
      sortOptions,
      onSortChange,
      currentSort,
      variant,
      className,
      ...props
    },
    ref
  ) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const placeholderColor = isDark ? '#9ca3af' : '#6b7280';

    const hasActiveFilter = Boolean(activeFilterCount && activeFilterCount > 0);

    return (
      <View
        ref={ref}
        className={cn(searchFilterBarVariants({ variant }), className)}
        {...props}
      >
        <View className="flex-row items-center gap-2">
          {/* Search input container */}
          <View className="flex-1 flex-row items-center bg-muted rounded-lg px-3 py-2 text-foreground">
            <Icon
              as={Search}
              size={18}
              className="text-muted-foreground mr-2 shrink-0"
            />
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              placeholderTextColor={placeholderColor}
              className={cn(
                'flex-1 text-foreground text-sm p-0 bg-transparent',
                Platform.select({
                  web: 'outline-none',
                })
              )}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchValue.length > 0 && (
              <Pressable
                onPress={() => onSearchChange('')}
                hitSlop={8}
                className="p-1 rounded-full active:bg-muted-foreground/20 ml-1 shrink-0"
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
              >
                <Icon as={X} size={16} className="text-muted-foreground" />
              </Pressable>
            )}
          </View>

          {/* Filter button */}
          {onFilterPress && (
            <Pressable
              onPress={onFilterPress}
              className={cn(filterButtonVariants({ hasActiveFilter }))}
              accessibilityRole="button"
              accessibilityLabel="Open filter options"
            >
              <Icon as={SlidersHorizontal} size={18} className="text-foreground" />
              {hasActiveFilter && (
                <View className="absolute -top-1 -right-1 bg-primary rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center shadow-sm">
                  <Text className="text-primary-foreground text-[10px] font-bold leading-none text-center">
                    {activeFilterCount > 99 ? '99+' : activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* Sort options bar */}
        {sortOptions && sortOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2"
            contentContainerStyle={{ gap: 8 }}
          >
            {sortOptions.map((option) => {
              const isSelected = currentSort === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onSortChange?.(option.value)}
                  className={cn(
                    'flex-row items-center px-3 py-1.5 rounded-full border text-xs',
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'bg-muted/60 border-border active:bg-muted'
                  )}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    className={cn(
                      'text-xs font-medium',
                      isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }
);

SearchFilterBar.displayName = 'SearchFilterBar';

export { searchFilterBarVariants, filterButtonVariants };
export default SearchFilterBar;
