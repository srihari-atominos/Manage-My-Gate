import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { CheckCircle, X } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface SuccessToastProps {
  message: string;
  visible?: boolean;
  onDismiss?: () => void;
  duration?: number;
  className?: string;
}

export const SuccessToast = ({
  message,
  visible = true,
  onDismiss,
  duration = 3000,
  className,
}: SuccessToastProps) => {
  useEffect(() => {
    if (visible && duration > 0 && onDismiss) {
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
        'flex-row items-center rounded-xl bg-status-success/15 px-4 py-3 border border-status-success/30 shadow-xs',
        className
      )}
    >
      <CheckCircle size={18} className="me-2.5 text-status-success shrink-0" />
      <Text className="flex-1 text-xs font-semibold text-status-success">
        {message}
      </Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} className="ms-2 p-1 active:opacity-70">
          <X size={16} className="text-status-success" />
        </Pressable>
      ) : null}
    </Animated.View>
  );
};

export default SuccessToast;

