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
        'flex-row items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900',
        className
      )}
    >
      <Text className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
