import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Modal, TouchableOpacity } from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
  const [viewDate, setViewDate] = useState(() => (isValidDate ? value : new Date()));

  // Web platform rendering with visible styled native date input element
  if (Platform.OS === 'web') {
    const formattedWebValue = isValidDate
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
      : '';

    return (
      <View className={cn('w-full', className)}>
        {label && (
          <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </Text>
        )}
        <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <CalendarIcon size={20} className="me-2 text-slate-400" />
          <input
            type="date"
            className="flex-1 bg-transparent border-0 text-base font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer py-1 font-sans"
            value={formattedWebValue}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-').map(Number);
                onChange(new Date(y, m - 1, d));
              }
            }}
          />
        </View>
        {error && <Text className="mt-1.5 text-xs text-red-500">{error}</Text>}
      </View>
    );
  }

  // Native Mobile Platform Modal Picker
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(year, month, day);
    onChange(selected);
    setModalVisible(false);
  };

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      )}

      <Pressable
        className={cn(
          'flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-3.5 dark:border-slate-800 dark:bg-slate-900',
          error && 'border-red-500 dark:border-red-500'
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

      {error && <Text className="mt-1.5 text-xs text-red-500">{error}</Text>}

      {/* Interactive Mobile Date Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1">
                <X size={20} className="text-slate-400" />
              </TouchableOpacity>
            </View>

            {/* Month Navigation Header */}
            <View className="flex-row items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl p-2 mb-3">
              <TouchableOpacity onPress={handlePrevMonth} className="p-1">
                <ChevronLeft size={20} className="text-slate-700 dark:text-slate-200" />
              </TouchableOpacity>
              <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {MONTH_NAMES[month]} {year}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} className="p-1">
                <ChevronRight size={20} className="text-slate-700 dark:text-slate-200" />
              </TouchableOpacity>
            </View>

            {/* Days of Week Row */}
            <View className="flex-row justify-around mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} className="text-xs font-bold text-slate-400 w-8 text-center">
                  {d}
                </Text>
              ))}
            </View>

            {/* Month Days Grid */}
            <View className="flex-row flex-wrap">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} className="w-[14.28%] h-10" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected =
                  isValidDate &&
                  value.getDate() === day &&
                  value.getMonth() === month &&
                  value.getFullYear() === year;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => handleSelectDay(day)}
                    className={cn(
                      'w-[14.28%] h-10 items-center justify-center rounded-xl',
                      isSelected && 'bg-primary'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm font-semibold',
                        isSelected
                          ? 'text-white font-extrabold'
                          : 'text-slate-900 dark:text-slate-100'
                      )}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DatePicker;
