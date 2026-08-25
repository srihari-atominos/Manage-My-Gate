import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { DatePickerModal } from './DatePickerModal';

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
  const [modalVisible, setModalVisible] = useState(false);
  const isValidDate = value && !isNaN(value.getTime());

  return (
    <View className={cn('w-full', className)}>
      {Boolean(label) && (
        <Text className="mb-1.5 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        className={cn(
          'flex-row items-center rounded-xl border border-border bg-card px-3 py-3.5 shadow-xs active:bg-muted/60',
          Boolean(error) && 'border-destructive'
        )}
        onPress={() => setModalVisible(true)}
      >
        <CalendarIcon size={20} className="me-2 text-muted-foreground" />
        <Text
          className={cn(
            'flex-1 text-sm',
            isValidDate ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
        >
          {isValidDate
            ? value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : placeholder}
        </Text>
      </Pressable>

      {Boolean(error) && <Text className="mt-1.5 text-xs text-destructive">{error}</Text>}

      <DatePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedDate={value}
        onSelectDate={onChange}
        title={label || placeholder}
      />
    </View>
  );
};

export default DatePicker;
