import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { Amenity } from '../../../store/amenitySlice';
import { Building2, Calendar, Clock, Wrench, Users, ShieldAlert, CheckCircle2 } from 'lucide-react-native';

export interface MaintenanceReviewStepProps {
  facility?: Amenity;
  title: string;
  maintenanceType: string;
  assignedStaff: string;
  description: string;
  isRecurring: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  frequency: string;
  occurrenceCount: number;
  selectedDays: number[];
  autoCancelBookings: boolean;
  onToggleAutoCancel: (val: boolean) => void;
  isOngoing?: boolean;
}

const DAYS_MAP: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  0: 'Sun',
};

export const MaintenanceReviewStep: React.FC<MaintenanceReviewStepProps> = ({
  facility,
  title,
  maintenanceType,
  assignedStaff,
  description,
  isRecurring,
  startDate,
  endDate,
  startTime,
  endTime,
  frequency,
  occurrenceCount,
  selectedDays,
  autoCancelBookings,
  onToggleAutoCancel,
  isOngoing = true,
}) => {
  const recurringDaysText =
    selectedDays.length > 0
      ? selectedDays.map((d) => DAYS_MAP[d] || String(d)).join(', ')
      : 'Weekly';

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-6" keyboardShouldPersistTaps="handled">
      {/* Review Summary Card */}
      <View className="bg-card border border-border rounded-2xl p-4 gap-3.5">
        <View className="flex-row items-center gap-2 pb-2 border-b border-border/50">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
            Upkeep Specifications Summary
          </Text>
        </View>

        {/* Facility Info */}
        <View className="flex-row items-center gap-2.5">
          <Building2 size={16} className="text-primary shrink-0" />
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Facility</Text>
            <Text className="text-sm font-bold text-foreground">
              {facility?.name || 'Community Facility'}
            </Text>
          </View>
        </View>

        {/* Maintenance Type & Title */}
        <View className="flex-row items-center gap-2.5">
          <Wrench size={16} className="text-primary shrink-0" />
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Task & Type</Text>
            <Text className="text-sm font-bold text-foreground">
              {title || 'Routine Maintenance'}
            </Text>
            <Text className="text-[11px] font-semibold text-primary capitalize">
              Category: {maintenanceType?.toLowerCase() || 'general'}
            </Text>
          </View>
        </View>

        {/* Schedule */}
        <View className="flex-row items-center gap-2.5">
          <Calendar size={16} className="text-primary shrink-0" />
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Schedule</Text>
            {!isRecurring ? (
              <Text className="text-sm font-bold text-foreground">
                {startDate} {endDate && endDate !== startDate ? `to ${endDate}` : ''}
              </Text>
            ) : (
              <Text className="text-sm font-bold text-foreground">
                {frequency} ({recurringDaysText}) • {isOngoing ? 'Ongoing (Until Cancelled)' : `${occurrenceCount} sessions`} starting {startDate}
              </Text>
            )}
          </View>
        </View>

        {/* Operating Times */}
        <View className="flex-row items-center gap-2.5">
          <Clock size={16} className="text-primary shrink-0" />
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Hours</Text>
            <Text className="text-sm font-bold text-foreground">
              {startTime || '00:00'} – {endTime || '17:00'}
            </Text>
          </View>
        </View>

        {/* Staff */}
        {assignedStaff ? (
          <View className="flex-row items-center gap-2.5">
            <Users size={16} className="text-primary shrink-0" />
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground">Assigned Team / Vendor</Text>
              <Text className="text-sm font-semibold text-foreground">{assignedStaff}</Text>
            </View>
          </View>
        ) : null}

        {/* Notes */}
        {description ? (
          <View className="pt-2 border-t border-border/40">
            <Text className="text-xs text-muted-foreground">Notes:</Text>
            <Text className="text-xs text-foreground italic mt-0.5">"{description}"</Text>
          </View>
        ) : null}
      </View>

      {/* Auto-Cancel Conflicts Toggle */}
      <View className="bg-card border border-border rounded-2xl p-3.5 gap-2">
        <ToggleSwitch
          label="Auto-Cancel Conflicting Bookings"
          description="Automatically cancel any resident reservations overlapping with this window and notify residents"
          value={autoCancelBookings}
          onValueChange={onToggleAutoCancel}
        />
        {autoCancelBookings && (
          <View className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex-row items-center gap-2 mt-1">
            <ShieldAlert size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <Text className="text-[11px] text-amber-700 dark:text-amber-300 flex-1">
              Existing conflicting reservations will be cancelled and slots unblocked upon confirmation.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default MaintenanceReviewStep;
