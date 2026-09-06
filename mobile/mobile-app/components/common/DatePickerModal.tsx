import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const formatDateString = (dateObj: Date): string => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function DatePickerModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'Select Date',
  minDate,
  maxDate,
}: DatePickerModalProps) {
  const initialDate = selectedDate || new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [showMonthSelector, setShowMonthSelector] = useState<boolean>(false);

  if (!visible) return null;

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (dayNumber: number) => {
    const chosenDate = new Date(viewYear, viewMonth, dayNumber, 12, 0, 0);
    onSelectDate(chosenDate);
    onClose();
  };

  // Days grid calculation
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  const isTodayMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDateNumber = today.getDate();

  const isSelectedMonth =
    selectedDate &&
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth;
  const selectedDateNumber = selectedDate ? selectedDate.getDate() : -1;

  // Generate Year Options (e.g. 2023 - 2032)
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View className="py-2">
        {/* Month & Year Navigation Header */}
        <View className="flex-row items-center justify-between mb-4 bg-muted/40 p-2.5 rounded-xl border border-border">
          <Pressable
            onPress={handlePrevMonth}
            className="p-2 rounded-lg bg-card border border-border active:bg-muted"
            accessibilityRole="button"
            accessibilityLabel="Previous Month"
          >
            <Icon as={ChevronLeft} size={18} className="text-foreground" />
          </Pressable>

          <Pressable
            onPress={() => setShowMonthSelector(!showMonthSelector)}
            className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 active:bg-primary/20"
          >
            <Icon as={CalendarIcon} size={16} className="text-primary" />
            <Text className="text-sm font-bold text-primary">
              {MONTHS[viewMonth]} {viewYear}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNextMonth}
            className="p-2 rounded-lg bg-card border border-border active:bg-muted"
            accessibilityRole="button"
            accessibilityLabel="Next Month"
          >
            <Icon as={ChevronRight} size={18} className="text-foreground" />
          </Pressable>
        </View>

        {/* Quick Month & Year Picker Overlay */}
        {showMonthSelector ? (
          <View className="bg-card p-3 rounded-2xl border border-border mb-4">
            <Text className="text-xs font-bold text-muted-foreground mb-2">Select Month</Text>
            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {MONTHS.map((m, idx) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setViewMonth(idx);
                    setShowMonthSelector(false);
                  }}
                  className={cn(
                    'w-[30%] py-2 items-center rounded-lg border text-xs',
                    viewMonth === idx
                      ? 'bg-primary border-primary'
                      : 'bg-muted/40 border-border active:bg-muted'
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      viewMonth === idx ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  >
                    {m.substring(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-xs font-bold text-muted-foreground mb-2">Select Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {yearsList.map((yr) => (
                <Pressable
                  key={yr}
                  onPress={() => {
                    setViewYear(yr);
                    setShowMonthSelector(false);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs me-1.5',
                    viewYear === yr
                      ? 'bg-primary border-primary'
                      : 'bg-muted/40 border-border active:bg-muted'
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      viewYear === yr ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  >
                    {yr}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Days of Week Header - Pixel Perfect 7 Columns */}
        <View className="flex-row w-full mb-2 border-b border-border/40 pb-2">
          {DAYS_OF_WEEK.map((day) => (
            <Text
              key={day}
              className="text-xs font-bold text-muted-foreground w-[14.28%] text-center uppercase"
            >
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Days Grid - Pixel Perfect 7 Columns */}
        <View className="flex-row flex-wrap w-full justify-start gap-y-2 mb-4">
          {/* Empty lead cells */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <View key={`empty-${i}`} className="w-[14.28%] h-10 items-center justify-center" />
          ))}

          {/* Days 1..N */}
          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isSelected = isSelectedMonth && selectedDateNumber === dayNum;
            const isToday = isTodayMonth && todayDateNumber === dayNum;

            const cellDate = new Date(viewYear, viewMonth, dayNum, 23, 59, 59);
            const isPastMin = minDate ? cellDate < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0) : false;
            const isFutureMax = maxDate ? cellDate > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59) : false;
            const isDisabled = isPastMin || isFutureMax;

            return (
              <View key={`day-${dayNum}`} className="w-[14.28%] items-center justify-center">
                <Pressable
                  disabled={isDisabled}
                  onPress={() => !isDisabled && handleSelectDay(dayNum)}
                  className={cn(
                    'w-9 h-9 items-center justify-center rounded-full border',
                    isDisabled
                      ? 'opacity-25 bg-transparent border-transparent'
                      : isSelected
                      ? 'bg-primary border-primary shadow-sm'
                      : isToday
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-card border-border/40 active:bg-muted'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-semibold',
                      isDisabled
                        ? 'text-muted-foreground line-through'
                        : isSelected
                        ? 'text-white'
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

        {/* Footer Actions */}
        <View className="flex-row gap-3 pt-2 border-t border-border/40">
          <Button
            variant="outline"
            onPress={() => {
              const now = new Date();
              setViewYear(now.getFullYear());
              setViewMonth(now.getMonth());
              onSelectDate(now);
              onClose();
            }}
            className="flex-1"
          >
            <Text className="font-semibold text-xs text-foreground">Select Today</Text>
          </Button>
          <Button variant="default" onPress={onClose} className="flex-1 bg-primary">
            <Text className="text-white font-bold text-xs">Close</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default DatePickerModal;
