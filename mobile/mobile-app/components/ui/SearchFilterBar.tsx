import * as React from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Search, X, SlidersHorizontal, QrCode } from 'lucide-react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { getStatusTabStyle } from './statusTabColors';

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
  onScanPress?: () => void; // opens hardware QR / barcode camera scanner
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
      onScanPress,
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
        {/* Row 1: Filter / Sort options bar */}
        {sortOptions && sortOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2.5"
            contentContainerStyle={{ gap: 8 }}
          >
            {sortOptions.map((option) => {
              const isSelected = currentSort === option.value;
              const statusStyle = getStatusTabStyle(option.value || option.label, isSelected);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onSortChange?.(option.value)}
                  className={cn(
                    'flex-row items-center px-3 py-1.5 rounded-full border text-xs',
                    statusStyle.containerClass
                  )}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    className={cn(
                      'text-xs font-sans',
                      statusStyle.textClass
                    )}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Row 2: Search input container & filter trigger */}
        <View className="flex-row items-center gap-2">
          {/* Search input container */}
          <View className="flex-1 flex-row items-center bg-card border border-border/80 rounded-2xl px-3.5 py-2.5 text-foreground">
            <Icon
              as={Search}
              size={18}
              className="text-muted-foreground me-2 shrink-0"
            />
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              placeholderTextColor={placeholderColor}
              className={cn(
                'flex-1 text-foreground text-sm font-sans p-0 bg-transparent',
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
                className="p-1 rounded-full active:bg-secondary ms-1 shrink-0"
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
              >
                <Icon as={X} size={16} className="text-muted-foreground" />
              </Pressable>
            )}

            {onScanPress && (
              <Pressable
                onPress={onScanPress}
                hitSlop={8}
                className="p-1.5 rounded-full active:bg-primary/10 ms-1 shrink-0"
                accessibilityRole="button"
                accessibilityLabel="Scan QR or Barcode"
              >
                <Icon as={QrCode} size={18} className="text-primary" />
              </Pressable>
            )}
          </View>

          {/* Filter button */}
          {onFilterPress && (
            <Pressable
              onPress={onFilterPress}
              className={cn(filterButtonVariants({ hasActiveFilter }), 'rounded-2xl border border-border/80 bg-card')}
              accessibilityRole="button"
              accessibilityLabel="Open filter options"
            >
              <Icon as={SlidersHorizontal} size={18} className="text-foreground" />
              {hasActiveFilter && (
                <View className="absolute -top-1 -right-1 bg-primary rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center">
                  <Text className="text-primary-foreground text-[10px] font-bold font-sans leading-none text-center">
                    {activeFilterCount > 99 ? '99+' : activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  }
);

SearchFilterBar.displayName = 'SearchFilterBar';

export { searchFilterBarVariants, filterButtonVariants };
export default SearchFilterBar;
