import React from 'react';
import { View, Text, Switch } from 'react-native';
import { cn } from '../../lib/utils';

export interface ToggleSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const ToggleSwitch = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  className,
}: ToggleSwitchProps) => {
  return (
    <View className={cn('flex-row items-center justify-between py-2', className)}>
      <View className="flex-1 pr-4">
        <Text className={cn('text-base font-medium text-slate-900 dark:text-slate-100', disabled && 'opacity-50')}>
          {label}
        </Text>
        {description && (
          <Text className={cn('mt-0.5 text-sm text-slate-500 dark:text-slate-400', disabled && 'opacity-50')}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#cbd5e1', true: '#4f46e5' }} // slate-300, indigo-600 (primary)
        thumbColor="#ffffff"
      />
    </View>
  );
};
