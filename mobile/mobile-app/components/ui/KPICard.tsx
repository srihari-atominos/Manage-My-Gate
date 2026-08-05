import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import * as LucideIcons from 'lucide-react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

export interface KPICardProps {
  title: string;
  value: string | number;
  iconName?: string;
  iconColor?: string;   // hex color for icon
  bgColor?: string;     // hex color for card bg
  trend?: { direction: 'up' | 'down'; value: string };
  subtitle?: string;
  onPress?: () => void;
  className?: string;
}

const kpiCardVariants = cva(
  cn(
    'w-[150px] rounded-xl p-3 shadow-sm border border-border/40 bg-card justify-between',
    Platform.select({
      web: 'transition-all duration-200 hover:shadow-md cursor-pointer select-none',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function getBgWithOpacity(color?: string, opacity: number = 0.12): string | undefined {
  if (!color) return undefined;
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  return trimmed;
}

const KPICard = React.forwardRef<View, KPICardProps>(
  (
    {
      title,
      value,
      iconName,
      iconColor = '#3b82f6',
      bgColor,
      trend,
      subtitle,
      onPress,
      className,
    },
    ref
  ) => {
    // Dynamic Lucide icon lookup
    const IconComponent = iconName
      ? (LucideIcons as Record<string, any>)[iconName]
      : null;

    const activeColorForBg = bgColor || (iconName ? iconColor : undefined);
    const computedBg = getBgWithOpacity(activeColorForBg, 0.12);

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={!onPress}
        style={computedBg ? { backgroundColor: computedBg } : undefined}
        className={cn(
          kpiCardVariants(),
          onPress && 'active:opacity-75',
          className
        )}
      >
        {/* Top Section: Icon Circle & Trend Indicator */}
        <View className="flex-row items-center justify-between mb-2">
          {IconComponent ? (
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: iconColor }}
            >
              <IconComponent size={16} color="#ffffff" />
            </View>
          ) : (
            <View />
          )}

          {trend ? (
            <View className="flex-row items-center gap-0.5">
              {trend.direction === 'up' ? (
                <TrendingUp size={14} color="#16a34a" />
              ) : (
                <TrendingDown size={14} color="#dc2626" />
              )}
              <Text
                className={cn(
                  'text-xs font-semibold',
                  trend.direction === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.value}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Middle Section: Value */}
        <Text
          className="text-xl font-bold text-foreground tracking-tight"
          numberOfLines={1}
        >
          {value}
        </Text>

        {/* Bottom Section: Title */}
        <Text
          className="text-xs text-muted-foreground mt-0.5 font-medium"
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Optional Subtitle */}
        {subtitle ? (
          <Text
            className="text-[10px] text-muted-foreground/80 mt-0.5"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
    );
  }
);

KPICard.displayName = 'KPICard';

export { KPICard, kpiCardVariants };
