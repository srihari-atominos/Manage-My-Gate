import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { DatePickerModal, formatDateString } from '@/components/common/DatePickerModal';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface ScheduleDateNavigatorProps {
  selectedDate: string; // e.g. "YYYY-MM-DD"
  onDateChange: (dateString: string) => void;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onToday?: () => void;
  title?: string;
  className?: string;
}

export function ScheduleDateNavigator({
  selectedDate,
  onDateChange,
  onPrevDate,
  onNextDate,
  onToday,
  title = 'Select Date',
  className,
}: ScheduleDateNavigatorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const parsedDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  const formattedDisplay = parsedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleStep = (direction: number) => {
    if (direction === -1 && onPrevDate) {
      onPrevDate();
    } else if (direction === 1 && onNextDate) {
      onNextDate();
    } else {
      const next = new Date(parsedDate);
      next.setDate(next.getDate() + direction);
      onDateChange(formatDateString(next));
    }
  };

  const handleSetToday = () => {
    if (onToday) {
      onToday();
    } else {
      onDateChange(formatDateString(new Date()));
    }
  };

  return (
    <View
      className={cn(
        'bg-card p-3 rounded-2xl border border-border flex-row items-center justify-between shadow-xs',
        className
      )}
    >
      {/* Previous Date Chevron Button */}
      <Pressable
        onPress={() => handleStep(-1)}
        className="p-2 rounded-full bg-muted/60 active:bg-muted"
        accessibilityRole="button"
        accessibilityLabel="Previous date"
      >
        <Icon as={ChevronLeft} size={18} className="text-foreground" />
      </Pressable>

      {/* Date Picker Trigger Pill */}
      <Pressable
        onPress={() => setIsPickerOpen(true)}
        className="flex-row items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 active:bg-primary/20"
        accessibilityRole="button"
        accessibilityLabel={`Selected date: ${formattedDisplay}. Tap to choose another date.`}
      >
        <Icon as={CalendarIcon} size={16} className="text-primary" />
        <Text className="font-bold text-xs text-primary">{formattedDisplay}</Text>
      </Pressable>

      {/* Quick Today & Next Date Actions */}
      <View className="flex-row items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onPress={handleSetToday}
          className="py-1 px-2.5 h-8 border-border"
          accessibilityLabel="Jump to today"
        >
          <Text className="text-xs font-semibold text-foreground">Today</Text>
        </Button>

        <Pressable
          onPress={() => handleStep(1)}
          className="p-2 rounded-full bg-muted/60 active:bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Next date"
        >
          <Icon as={ChevronRight} size={18} className="text-foreground" />
        </Pressable>
      </View>

      {/* Modal Date Picker Sheet */}
      <DatePickerModal
        visible={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedDate={parsedDate}
        onSelectDate={(d) => {
          onDateChange(formatDateString(d));
        }}
        title={title}
      />
    </View>
  );
}

export default ScheduleDateNavigator;
