import * as React from 'react';
import { Pressable, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as LucideIcons from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text, TextClassContext } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const fabVariants = cva(
  cn(
    'absolute bottom-20 right-4 z-50 flex-row items-center justify-center shadow-lg',
    Platform.select({
      web: 'cursor-pointer select-none transition-shadow hover:shadow-xl',
    })
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary',
        secondary: 'bg-secondary',
      },
      hasLabel: {
        true: 'rounded-full px-4 py-3 gap-2 min-h-[56px]',
        false: 'w-[56px] h-[56px] rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      hasLabel: false,
    },
  }
);

const fabTextVariants = cva('font-semibold text-base', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export interface FABProps extends VariantProps<typeof fabVariants> {
  iconName?: string;
  onPress: () => void;
  label?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export const FAB = React.forwardRef<View, FABProps>(
  (
    {
      iconName = 'Plus',
      onPress,
      label,
      variant = 'primary',
      className,
      ...props
    },
    ref
  ) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withTiming(0.9, { duration: 100 });
    };

    const handlePressOut = () => {
      scale.value = withTiming(1.0, { duration: 100 });
    };

    const CustomIcon = (LucideIcons as Record<string, any>)[iconName];
    const IconComponent = CustomIcon || Plus;
    const hasLabel = Boolean(label && label.trim().length > 0);

    return (
      <AnimatedPressable
        ref={ref as any}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle]}
        className={cn(fabVariants({ variant, hasLabel }), className)}
        accessibilityRole="button"
        accessibilityLabel={label || `Action button ${iconName}`}
        {...props}
      >
        <TextClassContext.Provider value={fabTextVariants({ variant })}>
          <Icon as={IconComponent} size={24} className={fabTextVariants({ variant })} />
          {hasLabel && (
            <Text className={cn('font-semibold text-base', fabTextVariants({ variant }))}>
              {label}
            </Text>
          )}
        </TextClassContext.Provider>
      </AnimatedPressable>
    );
  }
);

FAB.displayName = 'FAB';

export { fabVariants, fabTextVariants };
export default FAB;
