import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  labelClassName?: string;
}

export const Badge = ({
  label,
  variant = 'default',
  size = 'md',
  className,
  labelClassName,
  ...props
}: BadgeProps) => {
  const variantClasses = {
    default: 'bg-slate-100 dark:bg-slate-800',
    primary: 'bg-primary/10 dark:bg-primary/20',
    success: 'bg-emerald-100 dark:bg-emerald-900/30',
    warning: 'bg-amber-100 dark:bg-amber-900/30',
    error: 'bg-red-100 dark:bg-red-900/30',
    outline: 'border border-slate-200 bg-transparent dark:border-slate-700',
  };

  const textClasses = {
    default: 'text-slate-700 dark:text-slate-300',
    primary: 'text-primary dark:text-primary-foreground',
    success: 'text-emerald-700 dark:text-emerald-400',
    warning: 'text-amber-700 dark:text-amber-400',
    error: 'text-red-700 dark:text-red-400',
    outline: 'text-slate-600 dark:text-slate-400',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 rounded-sm',
    md: 'px-2 py-1 rounded-md',
  };

  const textSizeClasses = {
    sm: 'text-[10px] leading-3',
    md: 'text-xs leading-4',
  };

  return (
    <View
      className={cn(
        'items-center justify-center',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <Text
        className={cn(
          'font-semibold uppercase tracking-wider',
          textSizeClasses[size],
          textClasses[variant],
          labelClassName
        )}
      >
        {label}
      </Text>
    </View>
  );
};
