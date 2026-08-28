import * as React from 'react';
import {
  View,
  Pressable,
  Modal,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

// Note: For native system date pickers, install: npx expo install @react-native-community/datetimepicker
let DateTimePickerComponent: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePickerComponent = require('@react-native-community/datetimepicker');
  if (DateTimePickerComponent && DateTimePickerComponent.default) {
    DateTimePickerComponent = DateTimePickerComponent.default;
  }
} catch (e) {
  DateTimePickerComponent = null;
}

const MONTH_NAMES = [
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

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDate(date: Date | null, placeholder = 'Select date'): string {
  if (!date) return placeholder;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isSameDay(d1: Date | null, d2: Date | null): boolean {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const dateRangePickerVariants = cva('w-full flex-col', {
  variants: {
    variant: {
      default: '',
      bordered: 'border border-border p-3 rounded-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const dateTriggerVariants = cva(
  'flex-1 flex-row items-center bg-muted border border-border rounded-xl p-3 active:opacity-80',
  {
    variants: {
      hasValue: {
        true: 'bg-muted border-border',
        false: 'bg-muted/70 border-border/80',
      },
    },
    defaultVariants: {
      hasValue: false,
    },
  }
);

export interface DateRangePickerProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof dateRangePickerVariants> {
  startDate: Date | null;
  endDate?: Date | null;
  onStartDateChange?: (date: Date) => void;
  onEndDateChange?: (date: Date) => void;
  onDateChange?: (start: Date | null, end: Date | null) => void;
  mode?: 'single' | 'range';
  label?: string;
  minDate?: Date;
  className?: string;
}

export const DateRangePicker = React.forwardRef<View, DateRangePickerProps>(
  (
    {
      startDate,
      endDate = null,
      onStartDateChange,
      onEndDateChange,
      onDateChange,
      mode = 'single',
      label,
      minDate,
      variant,
      className,
      ...props
    },
    ref
  ) => {
    const [modalVisible, setModalVisible] = React.useState(false);
    const [activeTarget, setActiveTarget] = React.useState<'start' | 'end' | null>(null);

    const initialDate = React.useMemo(() => {
      if (activeTarget === 'end' && endDate) return endDate;
      if (activeTarget === 'end' && startDate) return startDate;
      if (startDate) return startDate;
      return new Date();
    }, [activeTarget, startDate, endDate]);

    const [tempDate, setTempDate] = React.useState<Date>(initialDate);
    const [viewYear, setViewYear] = React.useState<number>(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = React.useState<number>(initialDate.getMonth());

    const openPicker = (target: 'start' | 'end') => {
      setActiveTarget(target);
      const targetDate =
        target === 'end'
          ? endDate || startDate || new Date()
          : startDate || new Date();
      setTempDate(targetDate);
      setViewYear(targetDate.getFullYear());
      setViewMonth(targetDate.getMonth());
      setModalVisible(true);
    };

    const applyDateSelection = React.useCallback(
      (selected: Date) => {
        if (activeTarget === 'start') {
          onStartDateChange?.(selected);
          onDateChange?.(selected, endDate);
        } else if (activeTarget === 'end') {
          onEndDateChange?.(selected);
          onDateChange?.(startDate, selected);
        }
        setModalVisible(false);
      },
      [activeTarget, endDate, startDate, onStartDateChange, onEndDateChange, onDateChange]
    );

    const handleNativeChange = (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setModalVisible(false);
      }
      if (selectedDate) {
        setTempDate(selectedDate);
        if (Platform.OS === 'android') {
          applyDateSelection(selectedDate);
        }
      }
    };

    const handleConfirmModal = () => {
      applyDateSelection(tempDate);
    };

    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    };

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    };

    const isDateDisabled = React.useCallback(
      (year: number, month: number, day: number) => {
        const checkDate = new Date(year, month, day, 23, 59, 59);

        if (minDate) {
          const minStart = new Date(minDate);
          minStart.setHours(0, 0, 0, 0);
          if (checkDate < minStart) return true;
        }

        if (activeTarget === 'end' && startDate) {
          const startStart = new Date(startDate);
          startStart.setHours(0, 0, 0, 0);
          if (checkDate < startStart) return true;
        }

        return false;
      },
      [minDate, activeTarget, startDate]
    );

    const calendarCells = React.useMemo(() => {
      const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      const cells: (number | null)[] = [];
      for (let i = 0; i < firstDayIndex; i++) {
        cells.push(null);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push(d);
      }
      return cells;
    }, [viewYear, viewMonth]);

    const isSingle = mode === 'single';

    return (
      <View
        ref={ref}
        className={cn(dateRangePickerVariants({ variant }), className)}
        {...props}
      >
        {label ? (
          <Text variant="muted" className="text-xs font-medium text-muted-foreground mb-1.5">
            {label}
          </Text>
        ) : null}

        {isSingle ? (
          <Pressable
            onPress={() => openPicker('start')}
            className={cn(dateTriggerVariants({ hasValue: Boolean(startDate) }))}
            accessibilityRole="button"
            accessibilityLabel={label || 'Select date'}
          >
            <Icon as={Calendar} size={18} className="text-muted-foreground mr-2.5 shrink-0" />
            <Text
              className={cn(
                'text-sm font-medium flex-1',
                startDate ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {formatDate(startDate, 'Select date')}
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-3">
            {/* Start Date Trigger */}
            <View className="flex-1">
              <Text className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
                From
              </Text>
              <Pressable
                onPress={() => openPicker('start')}
                className={cn(dateTriggerVariants({ hasValue: Boolean(startDate) }))}
                accessibilityRole="button"
                accessibilityLabel="Select start date"
              >
                <Icon as={Calendar} size={16} className="text-muted-foreground mr-2 shrink-0" />
                <Text
                  className={cn(
                    'text-sm font-medium flex-1',
                    startDate ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  numberOfLines={1}
                >
                  {formatDate(startDate, 'Start date')}
                </Text>
              </Pressable>
            </View>

            {/* End Date Trigger */}
            <View className="flex-1">
              <Text className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
                To
              </Text>
              <Pressable
                onPress={() => openPicker('end')}
                className={cn(dateTriggerVariants({ hasValue: Boolean(endDate) }))}
                accessibilityRole="button"
                accessibilityLabel="Select end date"
              >
                <Icon as={Calendar} size={16} className="text-muted-foreground mr-2 shrink-0" />
                <Text
                  className={cn(
                    'text-sm font-medium flex-1',
                    endDate ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  numberOfLines={1}
                >
                  {formatDate(endDate, 'End date')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Modal Date Picker */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
            className="flex-1 bg-black/60 justify-center items-center p-4"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-background border border-border rounded-2xl p-4 shadow-lg"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-border mb-3">
                <Text variant="large" className="text-base font-semibold text-foreground">
                  {activeTarget === 'end'
                    ? 'Select End Date'
                    : activeTarget === 'start' && mode === 'range'
                    ? 'Select Start Date'
                    : 'Select Date'}
                </Text>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  hitSlop={8}
                  className="p-1 rounded-full active:bg-muted"
                  accessibilityRole="button"
                  accessibilityLabel="Close date picker modal"
                >
                  <Icon as={X} size={18} className="text-muted-foreground" />
                </Pressable>
              </View>

              {/* Native DateTimePicker or Fallback Custom Calendar */}
              {DateTimePickerComponent ? (
                <View className="py-2 items-center">
                  <DateTimePickerComponent
                    value={tempDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={handleNativeChange}
                    minimumDate={activeTarget === 'end' && startDate ? startDate : minDate}
                  />
                  {Platform.OS === 'ios' && (
                    <View className="flex-row justify-end gap-2 w-full mt-4">
                      <Pressable
                        onPress={() => setModalVisible(false)}
                        className="px-4 py-2 rounded-xl bg-muted active:opacity-80"
                      >
                        <Text className="text-sm font-medium text-foreground">Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleConfirmModal}
                        className="px-4 py-2 rounded-xl bg-primary active:opacity-80"
                      >
                        <Text className="text-sm font-medium text-primary-foreground">Done</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : (
                /* Fallback Custom Calendar */
                <View>
                  {/* Month Navigation */}
                  <View className="flex-row items-center justify-between mb-3 px-1">
                    <Pressable
                      onPress={handlePrevMonth}
                      className="p-1.5 rounded-lg bg-muted active:bg-accent"
                      accessibilityRole="button"
                      accessibilityLabel="Previous month"
                    >
                      <Icon as={ChevronLeft} size={18} className="text-foreground" />
                    </Pressable>

                    <Text className="text-sm font-semibold text-foreground">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </Text>

                    <Pressable
                      onPress={handleNextMonth}
                      className="p-1.5 rounded-lg bg-muted active:bg-accent"
                      accessibilityRole="button"
                      accessibilityLabel="Next month"
                    >
                      <Icon as={ChevronRight} size={18} className="text-foreground" />
                    </Pressable>
                  </View>

                  {/* Day of Week Headers */}
                  <View className="flex-row justify-between mb-1">
                    {DAY_NAMES.map((day) => (
                      <Text
                        key={day}
                        className="w-[14.28%] text-center text-xs font-semibold text-muted-foreground"
                      >
                        {day}
                      </Text>
                    ))}
                  </View>

                  {/* Calendar Grid */}
                  <View className="flex-row flex-wrap mb-4">
                    {calendarCells.map((day, idx) => {
                      if (day === null) {
                        return <View key={`empty-${idx}`} className="w-[14.28%] h-9" />;
                      }

                      const cellDate = new Date(viewYear, viewMonth, day);
                      const isSelected = isSameDay(cellDate, tempDate);
                      const disabled = isDateDisabled(viewYear, viewMonth, day);
                      const isTodayDate = isSameDay(cellDate, new Date());

                      return (
                        <Pressable
                          key={`day-${day}`}
                          disabled={disabled}
                          onPress={() => setTempDate(cellDate)}
                          className={cn(
                            'w-[14.28%] h-9 items-center justify-center rounded-lg my-0.5',
                            isSelected
                              ? 'bg-primary'
                              : isTodayDate
                              ? 'bg-accent border border-primary/40'
                              : 'active:bg-muted',
                            disabled && 'opacity-30'
                          )}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected, disabled }}
                        >
                          <Text
                            className={cn(
                              'text-xs font-medium text-center',
                              isSelected
                                ? 'text-primary-foreground font-bold'
                                : 'text-foreground'
                            )}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Footer Actions */}
                  <View className="flex-row items-center justify-between pt-3 border-t border-border">
                    <Pressable
                      onPress={() => setTempDate(new Date())}
                      className="px-3 py-1.5 rounded-lg bg-muted active:opacity-80"
                    >
                      <Text className="text-xs font-medium text-foreground">Today</Text>
                    </Pressable>

                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => setModalVisible(false)}
                        className="px-3 py-2 rounded-xl bg-muted active:opacity-80"
                      >
                        <Text className="text-xs font-medium text-foreground">Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleConfirmModal}
                        className="px-4 py-2 rounded-xl bg-primary active:opacity-80 flex-row items-center gap-1"
                      >
                        <Icon as={Check} size={14} className="text-primary-foreground" />
                        <Text className="text-xs font-semibold text-primary-foreground">
                          Confirm
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }
);

DateRangePicker.displayName = 'DateRangePicker';

export { dateRangePickerVariants, dateTriggerVariants };
export default DateRangePicker;
