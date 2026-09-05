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
  labelClassName?: string;
}

export const Checkbox = ({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
  labelClassName,
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
          'mt-0.5 h-5 w-5 items-center justify-center rounded-md border',
          checked
            ? 'border-primary bg-primary'
            : 'border-border bg-card'
        )}
      >
        {checked && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>
      {(Boolean(label) || Boolean(description)) && (
        <View className="ms-2 flex-1 justify-center">
          {Boolean(label) && (
            <Text className={cn('text-[15px] font-medium font-sans text-foreground', labelClassName)}>
              {label}
            </Text>
          )}
          {Boolean(description) && (
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
};
