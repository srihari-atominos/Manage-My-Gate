import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface SectionDividerProps extends ViewProps {
  label?: string;
  className?: string;
  lineClassName?: string;
  labelClassName?: string;
}

export const SectionDivider = ({
  label,
  className,
  lineClassName,
  labelClassName,
  ...props
}: SectionDividerProps) => {
  if (!label) {
    return (
      <View
        className={cn('h-[1px] w-full bg-slate-200 dark:bg-slate-800', className)}
        {...props}
      />
    );
  }

  return (
    <View
      className={cn('flex-row items-center justify-center my-4', className)}
      {...props}
    >
      <View className={cn('h-[1px] flex-1 bg-slate-200 dark:bg-slate-800', lineClassName)} />
      <Text
        className={cn(
          'mx-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400',
          labelClassName
        )}
      >
        {label}
      </Text>
      <View className={cn('h-[1px] flex-1 bg-slate-200 dark:bg-slate-800', lineClassName)} />
    </View>
  );
};
