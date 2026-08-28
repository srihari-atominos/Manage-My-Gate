import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from '../../lib/utils';

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onValueChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const RadioGroup = ({
  options,
  value,
  onValueChange,
  orientation = 'vertical',
  className,
}: RadioGroupProps) => {
  return (
    <View
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-3',
        className
      )}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        
        return (
          <Pressable
            key={option.value}
            className={cn(
              'flex-row items-center',
              orientation === 'horizontal' && 'mr-2'
            )}
            onPress={() => onValueChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
          >
            <View
              className={cn(
                'h-5 w-5 items-center justify-center rounded-full border-2',
                isSelected
                  ? 'border-primary'
                  : 'border-border'
              )}
            >
              {isSelected && (
                <View className="h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </View>
            <View className="ms-3">
              <Text className="text-[15px] font-medium font-sans text-foreground">
                {option.label}
              </Text>
              {option.description && (
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};
