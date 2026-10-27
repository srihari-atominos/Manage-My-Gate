import * as React from 'react';
import { Pressable, View, Platform, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LucideIcons from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text, TextClassContext } from './text';
import { Icon } from './icon';
import { cn } from '../../lib/utils';
import {
  calculateSnapTarget,
  calculateVerticalBounds,
  clamp,
} from '../../src/utils/draggablePhysics';

const fabVariants = cva(
  cn(
    'z-50 flex-row items-center justify-center shadow-lg border border-border/40',
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
        true: 'rounded-full px-5 py-3 gap-2 min-h-[52px]',
        false: 'w-[54px] h-[54px] rounded-full',
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
  /**
   * Enables interactive hold-and-move gesture with magnetic edge-snapping physics.
   * Defaults to true.
   */
  draggable?: boolean;
}

export const FAB = React.forwardRef<View, FABProps>(
  (
    {
      iconName = 'Plus',
      onPress,
      label,
      variant = 'primary',
      className,
      draggable = true,
      ...props
    },
    ref
  ) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const hasLabel = Boolean(label && label.trim().length > 0);
    const fabWidth = hasLabel ? 140 : 54;
    const fabHeight = 54;

    const { minY, maxY } = React.useMemo(
      () => calculateVerticalBounds(screenHeight, insets.top, insets.bottom, fabHeight, 56, 84),
      [screenHeight, insets.top, insets.bottom, fabHeight]
    );

    const minX = 16;
    const maxX = screenWidth - fabWidth - 16;

    // Initial resting coordinates (bottom-right)
    const initialX = screenWidth - fabWidth - 16;
    const initialY = clamp(screenHeight - fabHeight - 96, minY, maxY);

    const translateX = useSharedValue(initialX);
    const translateY = useSharedValue(initialY);
    const startX = useSharedValue(initialX);
    const startY = useSharedValue(initialY);

    const scale = useSharedValue(1);

    const handlePressIn = () => {
      scale.value = withTiming(0.92, { duration: 80 });
    };

    const handlePressOut = () => {
      scale.value = withTiming(1.0, { duration: 100 });
    };

    const triggerOnPress = () => {
      if (onPress) onPress();
    };

    // Pan Gesture for hold-and-move interaction
    const panGesture = Gesture.Pan()
      .minDistance(6)
      .onStart(() => {
        'worklet';
        startX.value = translateX.value;
        startY.value = translateY.value;
        scale.value = withSpring(1.1);
      })
      .onUpdate((event) => {
        'worklet';
        translateX.value = clamp(startX.value + event.translationX, minX, maxX);
        translateY.value = clamp(startY.value + event.translationY, minY, maxY);
      })
      .onEnd(() => {
        'worklet';
        const snapX = calculateSnapTarget(translateX.value, screenWidth, fabWidth, 16);
        const snapY = clamp(translateY.value, minY, maxY);

        translateX.value = withSpring(snapX, {
          damping: 18,
          stiffness: 200,
          mass: 0.8,
        });
        translateY.value = withSpring(snapY, {
          damping: 18,
          stiffness: 200,
          mass: 0.8,
        });
        scale.value = withSpring(1.0);
      });

    // Tap Gesture
    const tapGesture = Gesture.Tap().onEnd(() => {
      'worklet';
      runOnJS(triggerOnPress)();
    });

    const composedGesture = Gesture.Race(panGesture, tapGesture);

    const animatedStyle = useAnimatedStyle(() => {
      if (!draggable) {
        return {
          transform: [{ scale: scale.value }],
        };
      }
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: scale.value },
        ],
      };
    });

    const CustomIcon = (LucideIcons as Record<string, any>)[iconName];
    const IconComponent = CustomIcon || Plus;

    if (!draggable) {
      return (
        <Pressable
          ref={ref as any}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className={cn('absolute bottom-20 end-4', fabVariants({ variant, hasLabel }), className)}
          accessibilityRole="button"
          accessibilityLabel={label || `Action button ${iconName}`}
          {...props}
        >
          <Animated.View
            style={[animatedStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
          >
            <TextClassContext.Provider value={fabTextVariants({ variant })}>
              <Icon as={IconComponent} size={24} className={fabTextVariants({ variant })} />
              {hasLabel && (
                <Text className={cn('font-semibold text-base ms-2', fabTextVariants({ variant }))}>
                  {label}
                </Text>
              )}
            </TextClassContext.Provider>
          </Animated.View>
        </Pressable>
      );
    }

    return (
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 9998,
            },
            animatedStyle,
          ]}
        >
          <Pressable
            ref={ref as any}
            className={cn(fabVariants({ variant, hasLabel }), className)}
            accessibilityRole="button"
            accessibilityLabel={label || `Action button ${iconName}`}
            {...props}
          >
            <TextClassContext.Provider value={fabTextVariants({ variant })}>
              <Icon as={IconComponent} size={24} className={fabTextVariants({ variant })} />
              {hasLabel && (
                <Text className={cn('font-semibold text-base ms-2', fabTextVariants({ variant }))}>
                  {label}
                </Text>
              )}
            </TextClassContext.Provider>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    );
  }
);

FAB.displayName = 'FAB';

export const FABSpacer: React.FC<{ className?: string }> = ({ className }) => (
  <View className={cn('h-24', className)} />
);

export { fabVariants, fabTextVariants };
export default FAB;
