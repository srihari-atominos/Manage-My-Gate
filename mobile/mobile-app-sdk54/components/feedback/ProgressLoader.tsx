import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface ProgressLoaderProps {
  label?: string;
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  className?: string;
}

export const ProgressLoader = ({
  label,
  message,
  size = 'large',
  color = '#4f46e5', // indigo-600
  className,
}: ProgressLoaderProps) => {
  const displayText = label || message;
  return (
    <View className={cn('items-center justify-center p-4', className)}>
      <ActivityIndicator size={size} color={color} />
      {Boolean(displayText) && (
        <Text className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
          {displayText}
        </Text>
      )}
    </View>
  );
};
