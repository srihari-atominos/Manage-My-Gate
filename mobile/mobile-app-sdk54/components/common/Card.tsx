import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outline';
  className?: string;
}

export const Card = ({
  children,
  variant = 'default',
  className,
  ...props
}: CardProps) => {
  const variantClasses = {
    default: 'bg-card border border-border/80 shadow-xs',
    elevated: 'bg-card border border-border/70 shadow-xs shadow-black/5',
    outline: 'bg-transparent border border-border/80',
  };

  return (
    <View
      className={cn('rounded-2xl overflow-hidden', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </View>
  );
};

export interface CardHeaderProps extends ViewProps {
  className?: string;
}
export const CardHeader = ({ className, ...props }: CardHeaderProps) => (
  <View className={cn('p-4 flex-col space-y-1.5', className)} {...props} />
);

export interface CardContentProps extends ViewProps {
  className?: string;
}
export const CardContent = ({ className, ...props }: CardContentProps) => (
  <View className={cn('p-4 pt-0', className)} {...props} />
);

export interface CardFooterProps extends ViewProps {
  className?: string;
}
export const CardFooter = ({ className, ...props }: CardFooterProps) => (
  <View className={cn('p-4 pt-0 flex-row items-center', className)} {...props} />
);
