import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner = ({
  title = 'Error',
  message,
  onDismiss,
  className,
}: ErrorBannerProps) => {
  return (
    <View
      className={cn(
        'flex-row items-start rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30',
        className
      )}
    >
      <AlertTriangle size={20} className="mr-3 mt-0.5 text-red-600 dark:text-red-400" />
      <View className="flex-1">
        <Text className="text-sm font-bold text-red-900 dark:text-red-200">
          {title}
        </Text>
        <Text className="mt-1 text-sm text-red-700 dark:text-red-300">
          {message}
        </Text>
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} className="ml-3 p-1">
          <X size={18} className="text-red-500" />
        </Pressable>
      )}
    </View>
  );
};
