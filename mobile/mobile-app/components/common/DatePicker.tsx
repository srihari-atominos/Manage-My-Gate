import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
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
  minDate?: Date;
  maxDate?: Date;
}

export const DatePicker = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  className,
  minDate,
  maxDate,
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
        className={cn(
          'flex-row items-center rounded-xl border border-border bg-card px-3.5 py-3',
          Boolean(error) && 'border-destructive bg-destructive/5'
        )}
        onPress={() => setModalVisible(true)}
      >
        <CalendarIcon size={18} className="me-2.5 text-muted-foreground" />
        <Text
          className={cn(
            'flex-1 text-[15px] font-sans',
            isValidDate ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
        >
          {isValidDate
            ? value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : placeholder}
        </Text>
      </Pressable>

      {Boolean(error) && <Text className="mt-1 text-xs text-destructive font-medium ms-1">{error}</Text>}

      <DatePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedDate={value}
        onSelectDate={onChange}
        title={label || placeholder}
        minDate={minDate}
        maxDate={maxDate}
      />
    </View>
  );
};

export default DatePicker;
