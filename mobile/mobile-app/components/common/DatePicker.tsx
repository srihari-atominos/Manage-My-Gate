import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';
// Note: In a real app, this would wrap @react-native-community/datetimepicker or similar
// For structure purposes, this is a mock implementation representing the UI component.

export interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export const DatePicker = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  className,
}: DatePickerProps) => {
  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      )}
      <Pressable
        className={cn(
          'flex-row items-center rounded-xl border border-border bg-card px-3 py-3.5',
          error && 'border-destructive'
        )}
        onPress={() => {
          // Mocking date selection
          onChange(new Date());
        }}
      >
        <CalendarIcon size={20} className="me-2 text-muted-foreground" />
        <Text
          className={cn(
            'flex-1 text-base',
            value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {value ? value.toLocaleDateString() : placeholder}
        </Text>
      </Pressable>
      {error && (
        <Text className="mt-1.5 text-xs text-red-500">{error}</Text>
      )}
    </View>
  );
};
