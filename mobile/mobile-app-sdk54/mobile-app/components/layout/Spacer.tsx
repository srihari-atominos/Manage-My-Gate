import React from 'react';
import { View } from 'react-native';
import { cn } from '../../lib/utils';

export interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  horizontal?: boolean;
  className?: string;
}

export const Spacer = ({
  size = 'md',
  horizontal = false,
  className,
}: SpacerProps) => {
  const sizeClasses = {
    xs: horizontal ? 'w-1' : 'h-1',
    sm: horizontal ? 'w-2' : 'h-2',
    md: horizontal ? 'w-4' : 'h-4',
    lg: horizontal ? 'w-6' : 'h-6',
    xl: horizontal ? 'w-8' : 'h-8',
    '2xl': horizontal ? 'w-12' : 'h-12',
    '3xl': horizontal ? 'w-16' : 'h-16',
  };

  return (
    <View
      className={cn(sizeClasses[size], className)}
      accessibilityRole="none"
    />
  );
};
