import React from 'react';
import { View, ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { cn } from '../../lib/utils';

export interface ProgressBarProps extends ViewProps {
  progress: number; // 0 to 100
  color?: string;
  className?: string;
  barClassName?: string;
}

export const ProgressBar = ({
  progress,
  color = 'bg-primary',
  className,
  barClassName,
  ...props
}: ProgressBarProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(`${Math.min(Math.max(progress, 0), 100)}%`, { duration: 300 }),
    };
  });

  return (
    <View
      className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}
      {...props}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: progress }}
    >
      <Animated.View
        className={cn('h-full rounded-full', color, barClassName)}
        style={animatedStyle}
      />
    </View>
  );
};
