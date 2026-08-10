import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface ProgressLoaderProps {
  label?: string;
  size?: 'small' | 'large';
  color?: string;
  className?: string;
}

export const ProgressLoader = ({
  label,
  size = 'large',
  color = '#4f46e5', // indigo-600
  className,
}: ProgressLoaderProps) => {
  return (
    <View className={cn('items-center justify-center p-4', className)}>
      <ActivityIndicator size={size} color={color} />
      {label && (
        <Text className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </Text>
      )}
    </View>
  );
};
