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
        'flex-row items-start rounded-xl border border-destructive/20 bg-destructive/10 p-3.5',
        className
      )}
    >
      <AlertTriangle size={18} className="me-2.5 mt-0.5 text-destructive" />
      <View className="flex-1">
        <Text className="text-sm font-bold font-sans text-destructive">
          {title}
        </Text>
        <Text className="mt-0.5 text-xs font-sans text-destructive/90">
          {message}
        </Text>
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} className="ms-2 p-1">
          <X size={16} className="text-destructive" />
        </Pressable>
      )}
    </View>
  );
};
