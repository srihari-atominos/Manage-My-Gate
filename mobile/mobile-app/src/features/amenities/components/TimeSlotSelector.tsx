import React from 'react';
import { View, Pressable } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AmenitySlot } from '../store/amenitySlice';
import { cn } from '@/lib/utils';

export interface TimeSlotSelectorProps {
  slots: AmenitySlot[];
  selectedSlot: AmenitySlot | null;
  onSlotSelect: (slot: AmenitySlot) => void;
  loading?: boolean;
  selectedDate?: string;
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
  selectedDate,
}: TimeSlotSelectorProps) {
  if (loading) {
    return (
      <View className="py-4 items-center justify-center">
        <Text variant="muted" className="text-xs">Loading available time slots...</Text>
      </View>
    );
  }

  // Calculate current date/time to filter out finished time slots
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = selectedDate ? selectedDate === todayStr : true;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const visibleSlots = (slots || []).filter((slot) => {
    if (!slot) return false;
    // Omit closed slots
    if (slot.status?.toLowerCase() === 'closed') return false;

    // If viewing today, omit slots whose start time has already passed
    if (isToday && slot.startTime) {
      const [startH = 0, startM = 0] = slot.startTime.split(':').map(Number);
      const slotStartMinutes = startH * 60 + startM;
      if (slotStartMinutes <= currentMinutes) {
        return false;
      }
    }

    return true;
  });

  if (visibleSlots.length === 0) {
    return (
      <View className="p-5 bg-muted/30 rounded-2xl border border-border/50 items-center justify-center my-3">
        <Clock size={24} className="text-muted-foreground/60 mb-2" />
        <Text variant="small" className="font-semibold text-foreground text-center">
          No Remaining Time Slots
        </Text>
        <Text variant="muted" className="text-center text-xs mt-1 text-muted-foreground">
          All time slots for this date have finished or are unavailable. Please select a future date.
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
          <View className="w-2 h-2 rounded-full bg-emerald-500 me-1.5" />
          <Text className="text-[11px] font-semibold text-muted-foreground">
            {visibleSlots.length} Available
          </Text>
        </View>
      </View>

      {/* 2-Column Grid Cards */}
      <View className="flex-row flex-wrap justify-between gap-y-2">
        {visibleSlots.map((slot, index) => {
          const slotStartTime = slot?.startTime || '00:00';
          const slotEndTime = slot?.endTime || '00:00';
          const slotId = slot?._id || `${slotStartTime}-${slotEndTime}-${index}`;
          const isSelected =
            selectedSlot &&
            ((selectedSlot._id && slot?._id && selectedSlot._id === slot._id) ||
              (selectedSlot?.startTime === slotStartTime && selectedSlot?.endTime === slotEndTime));

          const availableCount =
            slot?.availableCount !== undefined
              ? slot.availableCount
              : slot?.capacity
              ? Math.max(0, slot.capacity - (slot.bookedCount || 0))
              : 1;

          const isAvailable =
            slot?.isAvailable !== undefined
              ? slot.isAvailable
              : slot?.status
              ? slot.status === 'Available'
              : availableCount > 0;

          const duration = getSlotDuration(slotStartTime, slotEndTime);

          return (
            <Pressable
              key={slotId}
              disabled={!isAvailable}
              onPress={() => onSlotSelect(slot)}
              className={cn(
                'w-[48.5%] rounded-xl p-2.5 border flex-col justify-between min-h-[78px] active:scale-[0.97] transition-all bg-card',
                isSelected
                  ? 'border-2 border-primary bg-primary/10 dark:bg-primary/20 shadow-xs'
                  : isAvailable
                  ? 'border-border shadow-2xs'
                  : 'border-dashed border-border/70 bg-muted/40 opacity-50'
              )}
            >
              {/* Top Row: Start Time & Checkmark if selected */}
              <View className="flex-row items-center justify-between">
                <Text
                  className={cn(
                    'text-base font-black tracking-tight text-start leading-5',
                    isSelected
                      ? 'text-primary font-extrabold'
                      : !isAvailable
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  )}
                >
                  {slotStartTime}
                </Text>

                {isSelected && (
                  <View className="h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check size={10} className="text-primary-foreground" strokeWidth={3} />
                  </View>
                )}
              </View>

              {/* Middle Row: End Time & Duration */}
              <View className="flex-row items-center my-0.5">
                <Text
                  className={cn(
                    'text-[10px] font-semibold me-1.5',
                    !isAvailable ? 'text-muted-foreground/60' : 'text-muted-foreground'
                  )}
                >
                  {slotEndTime}
                </Text>
                <Text
                  className={cn(
                    'text-[10px] font-medium',
                    !isAvailable ? 'text-muted-foreground/40' : 'text-muted-foreground'
                  )}
                >
                  {duration}
                </Text>
              </View>

              {/* Bottom Row: Canonical StatusBadge */}
              <StatusBadge
                label={isSelected ? 'Selected' : isAvailable ? 'Available' : 'Closed'}
                variant={isSelected ? 'success' : isAvailable ? 'info' : 'neutral'}
                size="sm"
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default TimeSlotSelector;
