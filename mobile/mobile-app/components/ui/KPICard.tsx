import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as LucideIcons from 'lucide-react-native';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

export type KPICardVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';

export const KPI_VARIANT_STYLES: Record<
  KPICardVariant,
  {
    iconBg: string;
    iconText: string;
    border: string;
  }
> = {
  default: {
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    border: 'border-border/60',
  },
  success: {
    iconBg: 'bg-status-success/10',
    iconText: 'text-status-success',
    border: 'border-status-success/20',
  },
  warning: {
    iconBg: 'bg-status-warning/10',
    iconText: 'text-status-warning',
    border: 'border-status-warning/20',
  },
  destructive: {
    iconBg: 'bg-destructive/10',
    iconText: 'text-destructive',
    border: 'border-destructive/20',
  },
  info: {
    iconBg: 'bg-status-info/10',
    iconText: 'text-status-info',
    border: 'border-status-info/20',
  },
};

export const kpiCardVariants = cva(
  cn(
    'min-w-[140px] rounded-xl p-3 shadow-xs border border-border bg-card justify-between',
    Platform.select({
      web: 'transition-all duration-200 hover:shadow-md cursor-pointer select-none',
    })
  ),
  {
    variants: {
      variant: {
        default: 'border-border/60',
        success: 'border-status-success/20',
        warning: 'border-status-warning/20',
        destructive: 'border-destructive/20',
        info: 'border-status-info/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface KPICardProps extends VariantProps<typeof kpiCardVariants> {
  title: string;
  value: string | number;
  variant?: KPICardVariant;
  iconName?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  bgColor?: string;
  trend?: { direction: 'up' | 'down'; value: string };
  subtitle?: string;
  onPress?: () => void;
  className?: string;
}

const KPICard = React.forwardRef<View, KPICardProps>(
  (
    {
      title,
      value,
      variant = 'default',
      iconName,
      icon,
      iconColor,
      bgColor,
      trend,
      subtitle,
      onPress,
      className,
    },
    ref
  ) => {
    const variantStyles = KPI_VARIANT_STYLES[variant] || KPI_VARIANT_STYLES.default;

    // Dynamic Lucide icon lookup
    const IconComponent = iconName
      ? ((LucideIcons as Record<string, any>)[iconName] as LucideIcon)
      : null;

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={!onPress}
        role={onPress ? 'button' : undefined}
        className={cn(
          kpiCardVariants({ variant }),
          onPress && 'active:opacity-75',
          className
        )}
      >
        {/* 1. [Lucide Icon] Section */}
        <View className="flex-row items-center justify-between mb-1.5">
          {icon ? (
            <View
              style={bgColor ? { backgroundColor: bgColor } : undefined}
              className={cn('size-8 rounded-full items-center justify-center', !bgColor && variantStyles.iconBg)}
            >
              {icon}
            </View>
          ) : IconComponent ? (
            <View
              style={bgColor ? { backgroundColor: bgColor } : undefined}
              className={cn('size-8 rounded-full items-center justify-center', !bgColor && variantStyles.iconBg)}
            >
              <Icon
                as={IconComponent}
                size={16}
                color={iconColor}
                className={!iconColor ? variantStyles.iconText : undefined}
              />
            </View>
          ) : (
            <View />
          )}
        </View>

        {/* 2. [Label] Section */}
        <Text
          className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider"
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* 3. [Value] Section */}
        <Text
          className="text-2xl font-extrabold text-foreground tracking-tight my-0.5"
          numberOfLines={1}
        >
          {value}
        </Text>

        {/* 4. [Trend / Status / Subtitle] Section */}
        {trend ? (
          <View className="flex-row items-center gap-x-1 mt-0.5">
            {trend.direction === 'up' ? (
              <Icon as={TrendingUp} size={13} className="text-status-success" />
            ) : (
              <Icon as={TrendingDown} size={13} className="text-destructive" />
            )}
            <Text
              className={cn(
                'text-xs font-semibold',
                trend.direction === 'up'
                  ? 'text-status-success'
                  : 'text-destructive'
              )}
            >
              {trend.value}
            </Text>
          </View>
        ) : subtitle ? (
          <Text
            className="text-[11px] text-muted-foreground/80 mt-0.5 font-medium"
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

export { KPICard };
export default KPICard;
