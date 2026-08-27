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
    default: 'bg-secondary border border-border',
    primary: 'bg-primary/10 border border-primary/20',
    success: 'bg-emerald-500/10 border border-emerald-500/20',
    warning: 'bg-amber-500/10 border border-amber-500/20',
    error: 'bg-destructive/10 border border-destructive/20',
    outline: 'border border-border bg-transparent',
  };

  const textClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-destructive',
    outline: 'text-muted-foreground',
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
