import React, { forwardRef } from 'react';
import { Pressable, Text, View, PressableProps } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  variant?: 
    | 'default' 
    | 'primary' 
    | 'destructive' 
    | 'destructive-outline'
    | 'stop'
    | 'stop-outline'
    | 'success'
    | 'edit'
    | 'warning'
    | 'warning-solid'
    | 'info'
    | 'info-solid'
    | 'purple'
    | 'outline' 
    | 'secondary' 
    | 'ghost' 
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      children,
      variant = 'default',
      size = 'default',
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      loading = false,
      disabled = false,
      className,
      textClassName,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'bg-primary border border-primary/90 shadow-xs',
      primary: 'bg-primary border border-primary/90 shadow-xs',
      destructive: 'bg-rose-600 active:bg-rose-700 shadow-xs',
      'destructive-outline': 'border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 shadow-xs',
      stop: 'bg-rose-600 active:bg-rose-700 shadow-xs',
      'stop-outline': 'border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 shadow-xs',
      success: 'bg-emerald-600 active:bg-emerald-700 shadow-xs',
      edit: 'border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 shadow-xs',
      warning: 'border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 shadow-xs',
      'warning-solid': 'bg-amber-600 active:bg-amber-700 shadow-xs',
      info: 'border border-blue-500/40 bg-blue-50 dark:bg-blue-950/40 shadow-xs',
      'info-solid': 'bg-blue-600 active:bg-blue-700 shadow-xs',
      purple: 'border border-purple-500/40 bg-purple-50 dark:bg-purple-950/40 shadow-xs',
      outline: 'border border-border/80 bg-card shadow-xs',
      secondary: 'bg-secondary border border-border/70 shadow-xs',
      ghost: 'bg-transparent',
      link: 'bg-transparent underline-offset-4',
    };

    const textClasses = {
      default: 'text-primary-foreground',
      primary: 'text-primary-foreground',
      destructive: 'text-white font-bold',
      'destructive-outline': 'text-rose-600 dark:text-rose-400 font-bold',
      stop: 'text-white font-bold',
      'stop-outline': 'text-rose-600 dark:text-rose-400 font-bold',
      success: 'text-white font-bold',
      edit: 'text-emerald-700 dark:text-emerald-400 font-bold',
      warning: 'text-amber-700 dark:text-amber-400 font-bold',
      'warning-solid': 'text-white font-bold',
      info: 'text-blue-700 dark:text-blue-400 font-bold',
      'info-solid': 'text-white font-bold',
      purple: 'text-purple-700 dark:text-purple-400 font-bold',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      link: 'text-primary underline',
    };

    const sizeClasses = {
      default: 'h-12 px-5 py-3 rounded-2xl',
      sm: 'h-9 rounded-xl px-3.5',
      lg: 'h-14 rounded-2xl px-8',
      icon: 'h-11 w-11 rounded-2xl',
    };

    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'flex-row items-center justify-center',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && 'opacity-50',
          className
        )}
        {...props}
      >
        {({ pressed }) => (
          <View className={cn('flex-row items-center', pressed && variant !== 'link' && 'opacity-80')}>
            {LeftIcon && !loading && (
              <LeftIcon size={18} className={cn('me-2', textClasses[variant])} />
            )}
            <Text
              className={cn(
                'text-base font-semibold',
                textClasses[variant],
                textClassName
              )}
            >
              {loading ? 'Loading...' : children}
            </Text>
            {RightIcon && !loading && (
              <RightIcon size={18} className={cn('ms-2', textClasses[variant])} />
            )}
          </View>
        )}
      </Pressable>
    );
  }
);
Button.displayName = 'Button';
