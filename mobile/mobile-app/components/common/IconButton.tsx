import React from 'react';
import { Pressable, PressableProps, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface IconButtonProps extends PressableProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
}

export const IconButton = ({
  icon: Icon,
  size = 'md',
  variant = 'default',
  disabled = false,
  className,
  iconClassName,
  ...props
}: IconButtonProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const variantClasses = {
    default: 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800',
    primary: 'bg-primary',
    secondary: 'bg-slate-100 dark:bg-slate-800',
    ghost: 'bg-transparent',
    destructive: 'bg-red-500',
  };

  const iconColors = {
    default: 'text-slate-700 dark:text-slate-300',
    primary: 'text-white',
    secondary: 'text-slate-900 dark:text-slate-100',
    ghost: 'text-slate-700 dark:text-slate-300',
    destructive: 'text-white',
  };

  return (
    <Pressable
      className={cn(
        'items-center justify-center rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        disabled && 'opacity-50',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {({ pressed }) => (
        <View className={cn(pressed && 'opacity-70')}>
          <Icon
            size={iconSizes[size]}
            className={cn(iconColors[variant], iconClassName)}
          />
        </View>
      )}
    </Pressable>
  );
};
