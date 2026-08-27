import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle, XCircle, Info, CheckCircle } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';

export interface AlertDialogProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const AlertDialog = ({
  type,
  title,
  message,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: AlertDialogProps) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={24} className="text-emerald-500" />;
      case 'error': return <XCircle size={24} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={24} className="text-amber-500" />;
      case 'info': return <Info size={24} className="text-blue-500" />;
    }
  };

  const getContainerStyle = () => {
    switch (type) {
      case 'success': return 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30';
      case 'error': return 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30';
      case 'warning': return 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30';
      case 'info': return 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30';
    }
  };

  return (
    <View className={cn('rounded-xl border p-4', getContainerStyle(), className)}>
      <View className="mb-3 flex-row items-center">
        {getIcon()}
        <Text className="ms-2 text-lg font-bold text-foreground">
          {title}
        </Text>
      </View>
      
      <Text className="mb-4 text-base text-foreground/80">
        {message}
      </Text>
      
      {(primaryActionLabel || secondaryActionLabel) && (
        <View className="flex-row justify-end space-x-3">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onPress={onSecondaryAction}
              className="px-4"
            >
              {secondaryActionLabel}
            </Button>
          )}
          {primaryActionLabel && onPrimaryAction && (
            <Button
              size="sm"
              onPress={onPrimaryAction}
              className="ms-3 px-4"
            >
              {primaryActionLabel}
            </Button>
          )}
        </View>
      )}
    </View>
  );
};
