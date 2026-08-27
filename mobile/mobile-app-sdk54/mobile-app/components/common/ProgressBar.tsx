import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface ProgressBarProps extends ViewProps {
  progress: number; // Accepts 0 to 100 or 0 to 1
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
  // Normalize progress to a safe 0-100 number
  let rawProgress = Number(progress);
  if (isNaN(rawProgress) || !isFinite(rawProgress)) {
    rawProgress = 0;
  } else if (rawProgress <= 1 && rawProgress > 0) {
    // If passed as decimal (e.g. 0.75), convert to percentage
    rawProgress = rawProgress * 100;
  }
  const safeProgress = Math.min(Math.max(rawProgress, 0), 100);

  return (
    <View
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary border border-border/40', className)}
      {...props}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: safeProgress }}
    >
      <View
        className={cn('h-full rounded-full', color, barClassName)}
        style={{ width: `${safeProgress}%` }}
      />
    </View>
  );
};

export default ProgressBar;
