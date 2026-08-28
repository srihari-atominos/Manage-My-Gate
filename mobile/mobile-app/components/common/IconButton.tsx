import React from 'react';
import { Pressable, PressableProps, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface IconButtonProps extends PressableProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
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
    default: 'bg-card border border-border',
    primary: 'bg-primary',
    secondary: 'bg-secondary border border-border',
    outline: 'bg-card border border-border',
    ghost: 'bg-transparent',
    destructive: 'bg-destructive',
  };

  const iconColors = {
    default: 'text-foreground',
    primary: 'text-primary-foreground',
    secondary: 'text-foreground',
    outline: 'text-foreground',
    ghost: 'text-foreground',
    destructive: 'text-destructive-foreground',
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
