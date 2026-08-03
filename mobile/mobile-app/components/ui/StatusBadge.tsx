import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'critical';

export interface StatusBadgeProps extends Omit<React.ComponentPropsWithoutRef<typeof View>, 'children'> {
  label: string;
  variant: StatusVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const STATUS_COLORS: Record<
  StatusVariant,
  {
    light: { bg: string; text: string; dot: string };
    dark: { bg: string; text: string; dot: string };
  }
> = {
  success: {
    light: { bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
    dark: { bg: '#052e16', text: '#86efac', dot: '#16a34a' },
  },
  warning: {
    light: { bg: '#ffedd5', text: '#c2410c', dot: '#ea580c' },
    dark: { bg: '#431407', text: '#fdba74', dot: '#ea580c' },
  },
  danger: {
    light: { bg: '#fee2e2', text: '#b91c1c', dot: '#dc2626' },
    dark: { bg: '#450a0a', text: '#fca5a5', dot: '#dc2626' },
  },
  info: {
    light: { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
    dark: { bg: '#172554', text: '#93c5fd', dot: '#2563eb' },
  },
  neutral: {
    light: { bg: '#f5f5f5', text: '#525252', dot: '#737373' },
    dark: { bg: '#262626', text: '#a3a3a3', dot: '#737373' },
  },
  critical: {
    light: { bg: '#f3e8ff', text: '#7e22ce', dot: '#9333ea' },
    dark: { bg: '#3b0764', text: '#c084fc', dot: '#9333ea' },
  },
};

export const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  // Visitor
  ACTIVE: 'success',
  PENDING: 'warning',
  REVOKED: 'danger',
  EXPIRED: 'neutral',
  // Billing
  PAID: 'success',
  UNPAID: 'danger',
  OVERDUE: 'critical',
  VERIFICATION_PENDING: 'warning',
  // Complaints status
  Open: 'info',
  Assigned: 'warning',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'neutral',
  // Priority
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Critical: 'critical',
  // Notification type
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'danger',
  INFO: 'info',
};

export function getStatusVariant(status: string): StatusVariant {
  return STATUS_VARIANT_MAP[status] || 'neutral';
}

const statusBadgeVariants = cva(
  'inline-flex flex-row items-center justify-center rounded-full self-start',
  {
    variants: {
      size: {
        sm: 'h-5 px-1.5 gap-1',
        md: 'h-6 px-2 gap-1.5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const statusBadgeTextVariants = cva('font-medium text-xs', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-xs',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

function PulsingDot({ color, size }: { color: string; size: 'sm' | 'md' }) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const dotSizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <Animated.View
      className={cn('rounded-full', dotSizeClass)}
      style={[{ backgroundColor: color }, animatedStyle]}
    />
  );
}

const StatusBadge = React.forwardRef<View, StatusBadgeProps>(
  ({ label, variant = 'neutral', size = 'md', dot = false, className, style, ...props }, ref) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const validVariant = STATUS_COLORS[variant] ? variant : 'neutral';
    const colorConfig = isDark ? STATUS_COLORS[validVariant].dark : STATUS_COLORS[validVariant].light;

    return (
      <View
        ref={ref}
        className={cn(statusBadgeVariants({ size }), className)}
        style={[{ backgroundColor: colorConfig.bg }, style]}
        {...props}
      >
        {dot && <PulsingDot color={colorConfig.dot} size={size} />}
        <Text
          className={cn(statusBadgeTextVariants({ size }))}
          style={{ color: colorConfig.text }}
        >
          {label}
        </Text>
      </View>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge, statusBadgeVariants, statusBadgeTextVariants };
