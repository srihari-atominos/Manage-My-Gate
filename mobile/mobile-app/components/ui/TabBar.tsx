import * as React from 'react';
import { View, Pressable, ScrollView, Platform } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const tabBarVariants = cva('my-2', {
  variants: {
    variant: {
      pill: 'bg-secondary/70 border border-border/80 rounded-2xl p-1',
      underline: 'border-b border-border/80',
    },
  },
  defaultVariants: {
    variant: 'pill',
  },
});

const tabItemVariants = cva(
  cn(
    'items-center justify-center relative flex-row',
    Platform.select({ web: 'cursor-pointer select-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        pill: 'py-2.5 px-4 rounded-xl',
        underline: 'py-3 px-4 border-b-2 -mb-[1px]',
      },
      isActive: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'pill',
        isActive: true,
        className: 'bg-card border border-border/80 shadow-xs',
      },
      {
        variant: 'pill',
        isActive: false,
        className: 'bg-transparent active:bg-card/40',
      },
      {
        variant: 'underline',
        isActive: true,
        className: 'border-primary',
      },
      {
        variant: 'underline',
        isActive: false,
        className: 'border-transparent active:bg-secondary/40',
      },
    ],
    defaultVariants: {
      variant: 'pill',
      isActive: false,
    },
  }
);

const tabTextVariants = cva('text-sm text-center', {
  variants: {
    variant: {
      pill: '',
      underline: '',
    },
    isActive: {
      true: 'text-foreground font-bold',
      false: 'text-muted-foreground font-semibold',
    },
  },
  defaultVariants: {
    variant: 'pill',
    isActive: false,
  },
});

export interface TabItem {
  key: string;
  label: string;
  badge?: number;
}

export interface TabBarProps extends VariantProps<typeof tabBarVariants> {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  variant?: 'pill' | 'underline';
  scrollable?: boolean;
  className?: string;
  contentContainerClassName?: string;
}

export const TabBar = React.forwardRef<View, TabBarProps>(
  (
    {
      tabs,
      activeTab,
      onTabChange,
      variant = 'pill',
      scrollable,
      className,
      contentContainerClassName,
      ...props
    },
    ref
  ) => {
    // Auto-enable horizontal scroll if more than 3 tabs are present or explicitly requested
    const isScrollable = scrollable ?? tabs.length > 3;

    const renderTabItems = () =>
      tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const hasBadge = typeof tab.badge === 'number' && tab.badge > 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            className={cn(
              tabItemVariants({ variant, isActive }),
              !isScrollable && 'flex-1'
            )}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text className={cn(tabTextVariants({ variant, isActive }))}>
              {tab.label}
            </Text>

            {hasBadge && (
              <View className="ms-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive items-center justify-center px-1">
                <Text className="text-white text-[10px] font-bold leading-none text-center">
                  {tab.badge! > 99 ? '99+' : tab.badge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      });

    if (isScrollable) {
      return (
        <View ref={ref} className={cn(tabBarVariants({ variant }), className)} {...props}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName={cn('flex-row items-center gap-1', contentContainerClassName)}
          >
            {renderTabItems()}
          </ScrollView>
        </View>
      );
    }

    return (
      <View
        ref={ref}
        className={cn(tabBarVariants({ variant }), 'flex-row', className)}
        {...props}
      >
        {renderTabItems()}
      </View>
    );
  }
);

TabBar.displayName = 'TabBar';

export { tabBarVariants, tabItemVariants, tabTextVariants };
export default TabBar;

