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
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'muted' | 'success' | 'info' | 'warning' | 'destructive';
  iconName?: string;
  iconColor?: string;
  bgColor?: string;
  trend?: { direction: 'up' | 'down'; value: string };
  subtitle?: string;
  onPress?: () => void;
  className?: string;
}

const variantStyles: Record<string, { card: string; iconContainer: string; iconColor: string }> = {
  default: {
    card: 'bg-card border-border/80',
    iconContainer: 'bg-primary/15',
    iconColor: '#6366f1',
  },
  primary: {
    card: 'bg-primary/10 border-primary/20',
    iconContainer: 'bg-primary',
    iconColor: '#ffffff',
  },
  success: {
    card: 'bg-emerald-500/10 border-emerald-500/20',
    iconContainer: 'bg-emerald-500',
    iconColor: '#ffffff',
  },
  destructive: {
    card: 'bg-destructive/10 border-destructive/20',
    iconContainer: 'bg-destructive',
    iconColor: '#ffffff',
  },
  warning: {
    card: 'bg-amber-500/10 border-amber-500/20',
    iconContainer: 'bg-amber-500',
    iconColor: '#ffffff',
  },
  info: {
    card: 'bg-sky-500/10 border-sky-500/20',
    iconContainer: 'bg-sky-500',
    iconColor: '#ffffff',
  },
  secondary: {
    card: 'bg-secondary/40 border-border/70',
    iconContainer: 'bg-secondary',
    iconColor: '#64748b',
  },
  accent: {
    card: 'bg-purple-500/10 border-purple-500/20',
    iconContainer: 'bg-purple-500',
    iconColor: '#ffffff',
  },
  muted: {
    card: 'bg-muted/40 border-border/50',
    iconContainer: 'bg-muted',
    iconColor: '#94a3b8',
  },
};

const kpiCardVariants = cva(
  cn(
    'w-[150px] rounded-2xl p-3.5 border justify-between active:bg-secondary/60',
    Platform.select({
      web: 'transition-all duration-200 hover:border-border cursor-pointer select-none',
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

const KPICard = React.forwardRef<View, KPICardProps>(
  (
    {
      title,
      value,
      variant = 'default',
      iconName,
      iconColor,
      bgColor,
      trend,
      subtitle,
      onPress,
      className,
    },
    ref
  ) => {
    // Safe Dynamic Lucide icon lookup
    const IconComponent = React.useMemo(() => {
      if (!iconName) return null;
      const icons = LucideIcons as Record<string, any>;
      return (
        icons[iconName] ||
        icons[iconName.replace('BarChart3', 'ChartColumn').replace('BarChart', 'ChartBar').replace('Sliders', 'SlidersHorizontal')] ||
        null
      );
    }, [iconName]);

    const activeStyle = variantStyles[variant] || variantStyles.default;
    const effectiveIconColor = iconColor || activeStyle.iconColor;

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={!onPress}
        className={cn(
          kpiCardVariants(),
          activeStyle.card,
          onPress && 'active:opacity-75',
          className
        )}
      >
        {/* Top Section: Icon Circle & Trend Indicator */}
        <View className="flex-row items-center justify-between mb-2">
          {IconComponent ? (
            <View
              className={cn(
                'w-8 h-8 rounded-full items-center justify-center',
                activeStyle.iconContainer
              )}
            >
              <IconComponent size={16} color={effectiveIconColor} />
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
                  'text-[12px] font-semibold font-sans',
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
          className="text-[20px] font-bold font-sans text-foreground tracking-tight"
          numberOfLines={1}
        >
          {value}
        </Text>

        {/* Bottom Section: Title */}
        <Text
          className="text-[13px] text-muted-foreground mt-0.5 font-medium font-sans"
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Optional Subtitle */}
        {subtitle ? (
          <Text
            className="text-[11px] text-muted-foreground/80 mt-0.5 font-sans"
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
export default KPICard;
