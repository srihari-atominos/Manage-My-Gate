import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  return (
    <View className={cn('items-center justify-center py-10 px-4', className)}>
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon size={40} className="text-slate-400 dark:text-slate-500" />
      </View>
      <Text className="mb-2 text-center text-xl font-bold text-slate-900 dark:text-white">
        {title}
      </Text>
      {description && (
        <Text className="mb-6 text-center text-base text-slate-500 dark:text-slate-400">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} className="px-6">
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </Button>
      )}
    </View>
  );
};
