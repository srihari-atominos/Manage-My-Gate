import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface CalendarProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  className?: string;
}

export const Calendar = ({
  selectedDate,
  onSelectDate,
  className,
}: CalendarProps) => {
  // This is a structural mock for a full calendar component
  // In production, use react-native-calendars
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  return (
    <View className={cn('rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900', className)}>
      <View className="mb-4 flex-row justify-between items-center">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">
          {selectedDate ? selectedDate.toLocaleDateString('default', { month: 'long', year: 'numeric' }) : 'Calendar'}
        </Text>
      </View>
      <View className="flex-row justify-between mb-2">
        {days.map((day) => (
          <Text key={day} className="text-xs font-semibold text-slate-500 w-8 text-center">{day}</Text>
        ))}
      </View>
      <View className="flex-row flex-wrap justify-between gap-y-2">
        {/* Mocking days 1-30 */}
        {Array.from({ length: 30 }).map((_, i) => (
          <View key={i} className="w-8 h-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
            <Text className="text-sm text-slate-700 dark:text-slate-300">{i + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
