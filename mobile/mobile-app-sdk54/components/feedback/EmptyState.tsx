import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  icon?: LucideIcon;
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
      {Icon ? (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-secondary border border-border/80 shadow-xs">
          <Icon size={30} color="#0d9488" />
        </View>
      ) : null}
      <Text className="mb-1 text-center text-lg font-bold font-sans text-foreground">
        {title}
      </Text>
      {description && (
        <Text className="mb-6 text-center text-sm font-sans text-muted-foreground max-w-xs">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} className="px-6">
          <Text className="font-semibold text-primary-foreground">{actionLabel}</Text>
        </Button>
      )}
    </View>
  );
};
