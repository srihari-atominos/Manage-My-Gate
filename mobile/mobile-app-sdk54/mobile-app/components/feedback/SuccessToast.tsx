import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle, X } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { cn } from '../../lib/utils';

export interface SuccessToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
  className?: string;
}

export const SuccessToast = ({
  message,
  visible,
  onDismiss,
  duration = 3000,
  className,
}: SuccessToastProps) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(300)}
      className={cn(
        'absolute left-4 right-4 top-10 z-50 flex-row items-center rounded-xl bg-emerald-50 px-4 py-3 shadow-sm border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/30',
        className
      )}
    >
      <CheckCircle size={20} className="mr-3 text-emerald-600 dark:text-emerald-400" />
      <Text className="flex-1 text-sm font-medium text-emerald-900 dark:text-emerald-200">
        {message}
      </Text>
      <Pressable onPress={onDismiss} className="ml-3 p-1">
        <X size={18} className="text-emerald-500" />
      </Pressable>
    </Animated.View>
  );
};
