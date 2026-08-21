import React from 'react';
import { View } from 'react-native';
import { LucideIcon, Inbox } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  const IconComponent = typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null) ? Icon : Inbox;

  return (
    <View className={cn('items-center justify-center py-10 px-4', className)}>
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted border border-border/50">
        <IconComponent size={38} className="text-muted-foreground" />
      </View>
      <Text variant="large" className="mb-2 text-center font-bold text-foreground">
        {title}
      </Text>
      {description ? (
        <Text variant="muted" className="mb-6 text-center text-sm text-muted-foreground max-w-xs">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="default" onPress={onAction} className="px-6">
          <Text className="font-semibold text-primary-foreground">{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
};

export default EmptyState;
