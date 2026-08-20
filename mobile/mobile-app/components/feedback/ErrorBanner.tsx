import React from 'react';
import { View, Pressable } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '../../lib/utils';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner = ({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  onDismiss,
  className,
}: ErrorBannerProps) => {
  return (
    <View
      className={cn(
        'flex-row items-center rounded-xl border border-destructive/20 bg-destructive/10 p-3.5',
        className
      )}
    >
      <Icon as={AlertCircle} size={20} className="me-3 shrink-0 text-destructive mt-0.5 self-start" />
      <View className="flex-1 justify-center">
        {Boolean(title) && (
          <Text className="text-sm font-bold text-destructive">
            {title}
          </Text>
        )}
        <Text className="text-xs font-medium text-destructive/90 mt-0.5">
          {message}
        </Text>
      </View>
      {onRetry && (
        <Button
          variant="destructive"
          size="sm"
          onPress={onRetry}
          className="ms-3 h-8 px-3"
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text className="text-xs font-semibold text-destructive-foreground">{retryLabel}</Text>
        </Button>
      )}
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          className="ms-2 p-1 rounded-full active:bg-destructive/20"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
        >
          <Icon as={X} size={16} className="text-destructive" />
        </Pressable>
      )}
    </View>
  );
};

export default ErrorBanner;
