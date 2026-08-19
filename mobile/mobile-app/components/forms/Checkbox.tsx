import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox = ({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}: CheckboxProps) => {
  return (
    <Pressable
      className={cn('flex-row items-start', disabled && 'opacity-50', className)}
      onPress={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View
        className={cn(
          'mt-0.5 h-5 w-5 items-center justify-center rounded border',
          checked
            ? 'border-primary bg-primary'
            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
        )}
      >
        {checked && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>
      {(Boolean(label) || Boolean(description)) && (
        <View className="ml-3 flex-1">
          {Boolean(label) && (
            <Text className="text-base font-medium text-slate-900 dark:text-slate-100">
              {label}
            </Text>
          )}
          {Boolean(description) && (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
};
