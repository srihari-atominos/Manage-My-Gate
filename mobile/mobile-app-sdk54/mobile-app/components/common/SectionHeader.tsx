import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const SectionHeader = ({
  title,
  actionLabel,
  onAction,
  className,
}: SectionHeaderProps) => {
  return (
    <View
      className={cn(
        'flex-row items-center justify-between px-4 py-2.5',
        className
      )}
    >
      <Text className="text-xs font-bold font-sans uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <Text className="text-sm font-semibold text-primary">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};
