import * as React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const tabBarVariants = cva('flex-row mx-4 my-2', {
  variants: {
    variant: {
      pill: 'bg-muted rounded-lg p-1',
      underline: 'border-b border-border',
    },
  },
  defaultVariants: {
    variant: 'pill',
  },
});

const tabItemVariants = cva(
  cn(
    'flex-1 items-center justify-center relative flex-row px-2',
    Platform.select({ web: 'cursor-pointer select-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        pill: 'py-2 rounded-md',
        underline: 'py-3 border-b-2 -mb-[1px]',
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
        className: 'bg-background shadow-sm',
      },
      {
        variant: 'pill',
        isActive: false,
        className: 'bg-transparent active:bg-background/40',
      },
      {
        variant: 'underline',
        isActive: true,
        className: 'border-primary',
      },
      {
        variant: 'underline',
        isActive: false,
        className: 'border-transparent active:bg-muted/40',
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
      true: 'text-foreground font-semibold',
      false: 'text-muted-foreground font-medium',
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
  className?: string;
}

export const TabBar = React.forwardRef<View, TabBarProps>(
  (
    {
      tabs,
      activeTab,
      onTabChange,
      variant = 'pill',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        className={cn(tabBarVariants({ variant }), className)}
        {...props}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const hasBadge = typeof tab.badge === 'number' && tab.badge > 0;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              className={cn(tabItemVariants({ variant, isActive }))}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Text className={cn(tabTextVariants({ variant, isActive }))}>
                {tab.label}
              </Text>

              {hasBadge && (
                <View className="absolute top-1 right-2 min-w-[18px] h-[18px] rounded-full bg-destructive items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold leading-none text-center">
                    {tab.badge! > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }
);

TabBar.displayName = 'TabBar';

export { tabBarVariants, tabItemVariants, tabTextVariants };
export default TabBar;
