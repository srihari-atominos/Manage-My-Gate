import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/utils';

export interface CalendarProps {
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export const Calendar = ({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  className,
}: CalendarProps) => {
  const displayDate = selectedDate || new Date();
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDateNumber = today.getDate();

  const isSelectedCurrentMonth =
    selectedDate &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month;
  const selectedDateNumber = selectedDate ? selectedDate.getDate() : -1;

  const monthName = displayDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  return (
    <View className={cn('rounded-2xl border border-border bg-card p-4 shadow-xs', className)}>
      <View className="mb-3 flex-row justify-between items-center">
        <Text className="text-base font-bold text-foreground">
          {monthName}
        </Text>
      </View>

      {/* Weekday headers */}
      <View className="flex-row justify-between mb-2 border-b border-border/40 pb-2">
        {daysOfWeek.map((day) => (
          <Text key={day} className="text-xs font-bold text-muted-foreground w-8 text-center uppercase">
            {day}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View className="flex-row flex-wrap justify-start gap-y-2">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <View key={`empty-${i}`} className="w-[14.28%] h-8 items-center justify-center" />
        ))}

        {/* Days 1..N */}
        {Array.from({ length: totalDaysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const isSelected = isSelectedCurrentMonth && selectedDateNumber === dayNum;
          const isToday = isCurrentMonth && todayDateNumber === dayNum;
          const currentCellDate = new Date(year, month, dayNum);

          const isBeforeMin = minDate && currentCellDate < minDate;
          const isAfterMax = maxDate && currentCellDate > maxDate;
          const isDisabled = isBeforeMin || isAfterMax;

          return (
            <View key={`day-${dayNum}`} className="w-[14.28%] items-center justify-center">
              <Pressable
                disabled={isDisabled || !onSelectDate}
                onPress={() => onSelectDate && onSelectDate(currentCellDate)}
                accessibilityRole="button"
                accessibilityLabel={`${monthName} ${dayNum}`}
                className={cn(
                  'w-8 h-8 items-center justify-center rounded-full border',
                  isSelected
                    ? 'bg-primary border-primary shadow-xs'
                    : isToday
                    ? 'bg-primary/15 border-primary/40'
                    : 'bg-card border-border/40 active:bg-muted',
                  isDisabled && 'opacity-30'
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-semibold',
                    isSelected
                      ? 'text-primary-foreground font-bold'
                      : isToday
                      ? 'text-primary font-bold'
                      : 'text-foreground'
                  )}
                >
                  {dayNum}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default Calendar;
