import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface DividerProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider = ({
  orientation = 'horizontal',
  className,
  ...props
}: DividerProps) => {
  return (
    <View
      className={cn(
        'bg-slate-200 dark:bg-slate-800',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  );
};
