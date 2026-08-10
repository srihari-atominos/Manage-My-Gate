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
    default: 'bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800',
    elevated: 'bg-white shadow-sm shadow-slate-200/50 dark:bg-slate-900 dark:shadow-none',
    outline: 'bg-transparent border border-slate-200 dark:border-slate-800',
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
