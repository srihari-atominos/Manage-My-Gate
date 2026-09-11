import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/common/Chip';
import { TextInput } from '@/components/forms/TextInput';
import { Timer, Hourglass, Calendar, ShieldAlert } from 'lucide-react-native';
import {
  DURATION_PRESETS,
  BUFFER_PRESETS,
  ADVANCE_DAYS_PRESETS,
} from '../../../constants/amenityCatalogPresets';

export interface ExclusiveHourlyConfigData {
  slotDurationMinutes: number | string;
  bufferTimeMinutes: number | string;
  advanceBookingDays: number | string;
}

export interface ExclusiveHourlyConfigStepProps {
  data: ExclusiveHourlyConfigData;
  onChange: (data: ExclusiveHourlyConfigData) => void;
  errors?: Partial<Record<keyof ExclusiveHourlyConfigData, string>>;
}

export const ExclusiveHourlyConfigStep: React.FC<ExclusiveHourlyConfigStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const currentDuration = parseInt(String(data.slotDurationMinutes || 60), 10);
  const currentBuffer = parseInt(String(data.bufferTimeMinutes || 0), 10);
  const currentAdvanceDays = parseInt(String(data.advanceBookingDays || 7), 10);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Court Slots & Buffer Settings
        </Text>
        <Text variant="muted" className="text-xs">
          Define discrete play windows, turnaround buffers, and advance booking limits.
        </Text>
      </View>

      {/* 1. Slot Duration Chips */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Timer size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Single Slot Duration
            </Text>
            <Text variant="muted" className="text-xs">
              Continuous playtime allocated per court reservation.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {DURATION_PRESETS.map((d) => (
            <Chip
              key={d}
              label={`${d} min`}
              selected={currentDuration === d}
              onPress={() => onChange({ ...data, slotDurationMinutes: d })}
            />
          ))}
        </View>

        <TextInput
          label="Custom Slot Duration (Minutes)"
          placeholder="60"
          keyboardType="numeric"
          value={String(data.slotDurationMinutes || '')}
          onChangeText={(val) => onChange({ ...data, slotDurationMinutes: val })}
          error={errors.slotDurationMinutes}
        />
      </View>

      {/* 2. Buffer Time Chips */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Hourglass size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Setup & Cleaning Buffer
            </Text>
            <Text variant="muted" className="text-xs">
              Automatic downtime between consecutive games for net cleaning.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {BUFFER_PRESETS.map((b) => (
            <Chip
              key={b}
              label={b === 0 ? 'No Buffer (0m)' : `${b} min`}
              selected={currentBuffer === b}
              onPress={() => onChange({ ...data, bufferTimeMinutes: b })}
            />
          ))}
        </View>
      </View>

      {/* 3. Advance Booking Window */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Calendar size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Advance Booking Horizon
            </Text>
            <Text variant="muted" className="text-xs">
              How far in advance residents are allowed to reserve this court.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {ADVANCE_DAYS_PRESETS.map((days) => (
            <Chip
              key={days}
              label={`${days} Days Ahead`}
              selected={currentAdvanceDays === days}
              onPress={() => onChange({ ...data, advanceBookingDays: days })}
            />
          ))}
        </View>
      </View>

      {/* Exclusive Mutex Highlight */}
      <View className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex-row gap-3 items-start">
        <ShieldAlert size={18} className="text-primary mt-0.5 shrink-0" />
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold text-primary">
            Mutex Slot Locking
          </Text>
          <Text className="text-xs text-muted-foreground leading-4">
            Only one resident can occupy the court during a confirmed {data.slotDurationMinutes || 60}-minute slot (+{data.bufferTimeMinutes || 0} min buffer). Overlapping requests are strictly rejected.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ExclusiveHourlyConfigStep;
