import React from 'react';
import { View, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { AmenitySlot } from '../store/amenitySlice';
import { cn } from '@/lib/utils';

export interface TimeSlotSelectorProps {
  slots: AmenitySlot[];
  selectedSlot: AmenitySlot | null;
  onSlotSelect: (slot: AmenitySlot) => void;
  loading?: boolean;
}

function getSlotDuration(start: string, end: string): string {
  try {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const diff = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
    return diff > 0 ? `${diff}m` : '60m';
  } catch {
    return '60m';
  }
}

export function TimeSlotSelector({
  slots,
  selectedSlot,
  onSlotSelect,
  loading = false,
}: TimeSlotSelectorProps) {
  if (loading) {
    return (
      <View className="py-4 items-center justify-center">
        <Text variant="muted" className="text-xs">Loading available time slots...</Text>
      </View>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <View className="p-4 bg-muted/30 rounded-xl border border-border/50 items-center justify-center my-2">
        <Text variant="muted" className="text-center text-xs">
          No available time slots found for the selected date.
        </Text>
      </View>
    );
  }

  return (
    <View className="my-1">
      {/* Section Title */}
      <View className="flex-row items-center justify-between mb-2">
        <Text variant="small" className="font-bold text-foreground">
          Select Time Slot
        </Text>

        {/* Top Legend Indicator */}
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-slate-400 me-1.5" />
          <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Closed
          </Text>
        </View>
      </View>

      {/* Sleek & Compact 2-Column Grid Cards */}
      <View className="flex-row flex-wrap justify-between gap-y-2">
        {slots.map((slot, index) => {
          const slotId = slot._id || `${slot.startTime}-${slot.endTime}-${index}`;
          const isSelected =
            selectedSlot &&
            ((selectedSlot._id && slot._id && selectedSlot._id === slot._id) ||
              (selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime));

          const availableCount =
            slot.availableCount !== undefined
              ? slot.availableCount
              : slot.capacity
              ? Math.max(0, slot.capacity - (slot.bookedCount || 0))
              : 1;

          const isAvailable =
            slot.isAvailable !== undefined
              ? slot.isAvailable
              : slot.status
              ? slot.status === 'Available'
              : availableCount > 0;

          const duration = getSlotDuration(slot.startTime, slot.endTime);

          return (
            <Pressable
              key={slotId}
              disabled={!isAvailable}
              onPress={() => onSlotSelect(slot)}
              className={cn(
                'w-[48.5%] rounded-xl p-2.5 border flex-col justify-between min-h-[78px] active:scale-[0.97] transition-all bg-card',
                isSelected
                  ? 'border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-xs'
                  : isAvailable
                  ? 'border-slate-200/90 dark:border-slate-800/90 shadow-2xs hover:border-slate-300'
                  : 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-50'
              )}
            >
              {/* Top Row: Start Time & Checkmark if selected */}
              <View className="flex-row items-center justify-between">
                <Text
                  className={cn(
                    'text-base font-black tracking-tight text-start leading-5',
                    isSelected
                      ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : !isAvailable
                      ? 'text-slate-400 dark:text-slate-600 line-through'
                      : 'text-slate-900 dark:text-white'
                  )}
                >
                  {slot.startTime}
                </Text>

                {isSelected && (
                  <View className="h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                    <Check size={10} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </View>

              {/* Middle Row: End Time & Duration */}
              <View className="flex-row items-center my-0.5">
                <Text
                  className={cn(
                    'text-[10px] font-semibold me-1.5',
                    !isAvailable ? 'text-slate-400/60' : 'text-slate-400 dark:text-slate-400'
                  )}
                >
                  {slot.endTime}
                </Text>
                <Text
                  className={cn(
                    'text-[10px] font-medium',
                    !isAvailable ? 'text-slate-400/40' : 'text-slate-400/80 dark:text-slate-500'
                  )}
                >
                  {duration}
                </Text>
              </View>

              {/* Bottom Row: Ultra-Sleek Status Pill Badge */}
              <View
                className={cn(
                  'flex-row items-center self-start px-2 py-0.5 rounded-full',
                  isSelected
                    ? 'bg-emerald-500'
                    : isAvailable
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/80'
                    : 'bg-slate-100 dark:bg-slate-800'
                )}
              >
                {/* Solid Status Dot */}
                <View
                  className={cn(
                    'w-1.5 h-1.5 rounded-full me-1',
                    isSelected
                      ? 'bg-white'
                      : isAvailable
                      ? 'bg-emerald-500'
                      : 'bg-slate-400'
                  )}
                />
                <Text
                  className={cn(
                    'text-[10px] font-bold tracking-wide',
                    isSelected
                      ? 'text-white'
                      : isAvailable
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {isSelected
                    ? 'Selected'
                    : isAvailable
                    ? 'Available'
                    : 'Closed'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default TimeSlotSelector;
