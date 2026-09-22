import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { DatePickerModal, formatDateString } from '@/components/common/DatePickerModal';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface AdminCalendarViewProps {
  currentDate: Date;
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateString: string) => void;
  bookingCountsByDate: Record<string, number>;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday?: () => void;
  className?: string;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function AdminCalendarView({
  currentDate,
  selectedDate,
  onSelectDate,
  bookingCountsByDate,
  onPrevDate,
  onNextDate,
  className,
}: AdminCalendarViewProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const today = new Date();
  const todayString = formatDateString(today);

  // Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthYearLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateObj = React.useMemo(() => {
    if (!selectedDate) return new Date();
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(selectedDate);
  }, [selectedDate]);

  return (
    <View className={cn('bg-card rounded-2xl border border-border/80 p-2.5 shadow-2xs', className)}>
      {/* Compact Month Navigation Bar */}
      <View className="flex-row items-center justify-between mb-2">
        {/* Previous Month Button */}
        <Pressable
          onPress={onPrevDate}
          className="p-1.5 rounded-full bg-muted/60 active:bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Icon as={ChevronLeft} size={16} className="text-foreground" />
        </Pressable>

        {/* Date / Month Picker Trigger Pill */}
        <Pressable
          onPress={() => setIsDatePickerOpen(true)}
          className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 active:bg-primary/20"
          accessibilityRole="button"
          accessibilityLabel={`Current view: ${monthYearLabel}. Tap to pick date.`}
        >
          <Icon as={CalendarIcon} size={13} className="text-primary" />
          <Text className="font-bold text-xs text-primary">{monthYearLabel}</Text>
        </Pressable>

        {/* Next Month Button */}
        <Pressable
          onPress={onNextDate}
          className="p-1.5 rounded-full bg-muted/60 active:bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Icon as={ChevronRight} size={16} className="text-foreground" />
        </Pressable>
      </View>

      {/* COMPACT MONTH VIEW */}
      <View>
        {/* Weekday Headers */}
        <View className="flex-row justify-between mb-1 border-b border-border/40 pb-1">
          {DAYS_OF_WEEK.map((day) => (
            <Text
              key={day}
              className="text-[10px] font-bold text-muted-foreground w-[14.28%] text-center uppercase"
            >
              {day}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View className="flex-row flex-wrap justify-start">
          {/* Leading empty cells */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <View key={`empty-${i}`} className="w-[14.28%] h-9 items-center justify-center" />
          ))}

          {/* Days 1..N */}
          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = dateString === selectedDate;
            const isToday = dateString === todayString;
            const count = bookingCountsByDate[dateString] || 0;

            return (
              <View key={`month-day-${dayNum}`} className="w-[14.28%] h-9 p-0.5 items-center justify-center">
                <Pressable
                  onPress={() => onSelectDate(dateString)}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthYearLabel} ${dayNum}, ${count} bookings`}
                  className={cn(
                    'w-full h-full items-center justify-center rounded-lg border flex-col',
                    isSelected
                      ? 'bg-primary border-primary shadow-xs'
                      : isToday
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-card border-border/30 active:bg-muted/60'
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-bold leading-tight',
                      isSelected
                        ? 'text-primary-foreground'
                        : isToday
                        ? 'text-primary'
                        : 'text-foreground'
                    )}
                  >
                    {dayNum}
                  </Text>

                  {/* Booking Count Indicator */}
                  {count > 0 ? (
                    <View
                      className={cn(
                        'px-1 py-0.2 rounded-full mt-0.5 items-center justify-center',
                        isSelected ? 'bg-white/30' : 'bg-primary/15'
                      )}
                    >
                      <Text
                        className={cn(
                          'text-[9px] font-bold leading-tight',
                          isSelected ? 'text-primary-foreground' : 'text-primary'
                        )}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {/* Date Picker Modal for Direct Navigation */}
      <DatePickerModal
        visible={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={selectedDateObj}
        onSelectDate={(d) => {
          onSelectDate(formatDateString(d));
          setIsDatePickerOpen(false);
        }}
        title="Select Date"
      />
    </View>
  );
}

export default AdminCalendarView;
