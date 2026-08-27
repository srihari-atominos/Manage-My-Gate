import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const skeletonVariants = cva('rounded-md', {
  variants: {
    variant: {
      text: 'bg-muted h-4 w-[75%] rounded-sm',
      circle: 'bg-muted h-10 w-10 rounded-full',
      card: 'bg-muted h-[120px] w-full rounded-lg mb-3',
      listItem:
        'h-[72px] w-full rounded-lg p-3 mb-2 flex-row items-center gap-3 border border-border bg-card',
      kpi: 'bg-muted h-[90px] w-[150px] rounded-lg',
      detail: 'bg-muted h-5 w-full rounded-md mb-2',
    },
  },
  defaultVariants: {
    variant: 'text',
  },
});

export interface SkeletonProps extends ViewProps {
  variant?: 'card' | 'listItem' | 'kpi' | 'detail' | 'text' | 'circle';
  count?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const Skeleton = React.forwardRef<View, SkeletonProps>(
  (
    {
      variant = 'text',
      count = 1,
      width,
      height,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const opacity = useSharedValue(1);

    React.useEffect(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const inlineStyle = React.useMemo(() => {
      const result: Record<string, any> = {};
      if (width !== undefined) result.width = width;
      if (height !== undefined) result.height = height;
      return result;
    }, [width, height]);

    const renderItem = (index: number, itemRef?: React.Ref<View>) => {
      if (variant === 'listItem') {
        return (
          <Animated.View
            key={index}
            ref={itemRef}
            style={[animatedStyle, inlineStyle, style]}
            className={cn(skeletonVariants({ variant }), className)}
            {...props}
          >
            <View className="h-10 w-10 rounded-full bg-muted shrink-0" />
            <View className="flex-1 justify-center gap-2">
              <View className="h-4 w-[60%] rounded-sm bg-muted" />
              <View className="h-3 w-[40%] rounded-sm bg-muted" />
            </View>
          </Animated.View>
        );
      }

      return (
        <Animated.View
          key={index}
          ref={itemRef}
          style={[animatedStyle, inlineStyle, style]}
          className={cn(skeletonVariants({ variant }), className)}
          {...props}
        />
      );
    };

    const itemCount = Math.max(1, count);

    if (itemCount > 1) {
      return (
        <View ref={ref} className="w-full flex-col">
          {Array.from({ length: itemCount }, (_, i) => renderItem(i))}
        </View>
      );
    }

    return renderItem(0, ref);
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton, skeletonVariants };
export default Skeleton;
