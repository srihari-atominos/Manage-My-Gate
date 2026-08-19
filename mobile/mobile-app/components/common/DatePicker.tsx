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
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      )}

      <Pressable
        className={cn(
          'flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-3.5 dark:border-slate-800 dark:bg-slate-900',
          Boolean(error) && 'border-red-500 dark:border-red-500'
        )}
        onPress={() => setModalVisible(true)}
      >
        <CalendarIcon size={20} className="me-2 text-slate-400" />
        <Text
          className={cn(
            'flex-1 text-base',
            isValidDate ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-400'
          )}
        >
          {isValidDate
            ? value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : placeholder}
        </Text>
      </Pressable>

      {Boolean(error) && <Text className="mt-1.5 text-xs text-red-500">{error}</Text>}

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
