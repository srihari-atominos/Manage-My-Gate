import React, { forwardRef } from 'react';
import { Pressable, Text, View, PressableProps } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
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
      destructive: 'bg-destructive border border-destructive/20 shadow-xs',
      outline: 'border border-border/80 bg-card shadow-xs',
      secondary: 'bg-secondary border border-border/70 shadow-xs',
      ghost: 'bg-transparent',
      link: 'bg-transparent underline-offset-4',
    };

    const textClasses = {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
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
