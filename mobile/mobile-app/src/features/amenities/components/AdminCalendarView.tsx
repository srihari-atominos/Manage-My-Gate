import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { DatePickerModal, formatDateString } from '@/components/common/DatePickerModal';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface AdminCalendarViewProps {
  currentDate: Date;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string | null; // "YYYY-MM-DD" | null
  selectedDate?: string; // legacy fallback "YYYY-MM-DD"
  onSelectDate: (dateString: string, isDoubleClick?: boolean) => void;
  bookingCountsByDate: Record<string, number>;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday?: () => void;
  className?: string;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function AdminCalendarView({
  currentDate,
  startDate: propStartDate,
  endDate: propEndDate,
  selectedDate: propSelectedDate,
  onSelectDate,
  bookingCountsByDate,
  onPrevDate,
  onNextDate,
  className,
}: AdminCalendarViewProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const lastTapRef = React.useRef<{ date: string; time: number }>({ date: '', time: 0 });

  const handleDatePress = (dateString: string) => {
    const now = Date.now();
    const isDoubleClick =
      lastTapRef.current.date === dateString &&
      now - lastTapRef.current.time < 350;

    lastTapRef.current = { date: dateString, time: now };
    onSelectDate(dateString, isDoubleClick);
  };

  const today = new Date();
  const todayString = formatDateString(today);

  // Normalize startDate and endDate
  const startDate = propStartDate || propSelectedDate || todayString;
  const endDate = propEndDate !== undefined ? propEndDate : (propStartDate ? null : propSelectedDate || null);

  // Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthYearLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const isWholeMonth = React.useMemo(() => {
    if (!startDate || !endDate) return false;
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;
    return startDate === startOfMonth && endDate === endOfMonth;
  }, [startDate, endDate, year, month, totalDaysInMonth]);

  const selectedDateObj = React.useMemo(() => {
    const targetDateStr = startDate || todayString;
    const parts = targetDateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(targetDateStr);
  }, [startDate, todayString]);

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
            const isStart = !isWholeMonth && dateString === startDate;
            const isEnd = !isWholeMonth && Boolean(endDate && dateString === endDate);
            const isSingle = !isWholeMonth && isStart && (!endDate || startDate === endDate);
            const isRangeStart = !isWholeMonth && isStart && Boolean(endDate && startDate !== endDate);
            const isRangeEnd = !isWholeMonth && isEnd && Boolean(startDate && startDate !== endDate);
            const isInRange = !isWholeMonth && Boolean(startDate && endDate && dateString > startDate && dateString < endDate);
            const isToday = dateString === todayString;
            const count = bookingCountsByDate[dateString] || 0;

            // Compute cell border and background styling for range connection
            let cellStyle = 'bg-card border-border/30 rounded-lg active:bg-muted/60';
            let textStyle = 'text-foreground';
            let countBg = 'bg-primary/15';
            let countText = 'text-primary';

            if (isSingle) {
              cellStyle = 'bg-primary border-primary rounded-lg shadow-xs';
              textStyle = 'text-primary-foreground';
              countBg = 'bg-white/30';
              countText = 'text-primary-foreground';
            } else if (isRangeStart) {
              cellStyle = 'bg-primary border-primary rounded-l-lg rounded-r-none shadow-xs';
              textStyle = 'text-primary-foreground';
              countBg = 'bg-white/30';
              countText = 'text-primary-foreground';
            } else if (isRangeEnd) {
              cellStyle = 'bg-primary border-primary rounded-r-lg rounded-l-none shadow-xs';
              textStyle = 'text-primary-foreground';
              countBg = 'bg-white/30';
              countText = 'text-primary-foreground';
            } else if (isInRange) {
              cellStyle = 'bg-primary/15 border-y border-primary/30 rounded-none';
              textStyle = 'text-primary font-bold';
              countBg = 'bg-primary/25';
              countText = 'text-primary';
            } else if (isToday) {
              cellStyle = 'bg-primary/10 border-primary/40 rounded-lg';
              textStyle = 'text-primary';
              countBg = 'bg-primary/15';
              countText = 'text-primary';
            }

            return (
              <View
                key={`month-day-${dayNum}`}
                className={cn(
                  'w-[14.28%] h-9 p-0.5 items-center justify-center',
                  (isRangeStart || isInRange) && 'pr-0',
                  (isRangeEnd || isInRange) && 'pl-0'
                )}
              >
                <Pressable
                  onPress={() => handleDatePress(dateString)}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthYearLabel} ${dayNum}, ${count} bookings${
                    isStart ? ', range start' : isEnd ? ', range end' : isInRange ? ', in range' : ''
                  }`}
                  className={cn(
                    'w-full h-full items-center justify-center border flex-col',
                    cellStyle
                  )}
                >
                  <Text className={cn('text-xs font-bold leading-tight', textStyle)}>
                    {dayNum}
                  </Text>

                  {/* Booking Count Indicator */}
                  {count > 0 ? (
                    <View
                      className={cn(
                        'px-1 py-0.2 rounded-full mt-0.5 items-center justify-center',
                        countBg
                      )}
                    >
                      <Text className={cn('text-[9px] font-bold leading-tight', countText)}>
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
