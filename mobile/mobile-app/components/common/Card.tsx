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
    default: 'bg-card border border-border',
    elevated: 'bg-card shadow-sm shadow-black/5 dark:shadow-none border border-border/50',
    outline: 'bg-transparent border border-border',
  };

  return (
    <View
      className={cn('rounded-xl overflow-hidden', variantClasses[variant], className)}
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
  <View className={cn('p-4 flex-col gap-y-1.5', className)} {...props} />
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
