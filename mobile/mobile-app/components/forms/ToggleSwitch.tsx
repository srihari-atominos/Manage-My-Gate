import React from 'react';
import { View, Switch } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className={cn('flex-row items-center justify-between py-2', className)}>
      <View className="flex-1 pe-4">
        <Text
          className={cn(
            'text-sm font-semibold text-foreground',
            disabled && 'opacity-50'
          )}
        >
          {label}
        </Text>
        {description && (
          <Text
            className={cn(
              'mt-0.5 text-xs text-muted-foreground',
              disabled && 'opacity-50'
            )}
          >
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: isDark ? '#262626' : '#e5e5e5', true: '#03A9F4' }}
        thumbColor={value ? '#ffffff' : isDark ? '#a3a3a3' : '#f4f4f5'}
      />
    </View>
  );
};

export default ToggleSwitch;

