import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { Chip } from '@/components/common/Chip';
import { Clock, CalendarCheck } from 'lucide-react-native';
import { SCHEDULE_PRESETS, DAYS_NAMES } from '../../../constants/amenityCatalogPresets';
import { cn } from '@/lib/utils';

export interface OperatingScheduleData {
  openTime: string;
  closeTime: string;
  openDays: number[];
}

export interface OperatingScheduleStepProps {
  data: OperatingScheduleData;
  onChange: (data: OperatingScheduleData) => void;
  errors?: Partial<Record<keyof OperatingScheduleData, string>>;
}

export const OperatingScheduleStep: React.FC<OperatingScheduleStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const toggleDay = (dayIndex: number) => {
    const current = [...data.openDays];
    const exists = current.indexOf(dayIndex);
    if (exists > -1) {
      current.splice(exists, 1);
    } else {
      current.push(dayIndex);
      current.sort();
    }
    onChange({ ...data, openDays: current });
  };

  const handleSelectPreset = (preset: { opensAt: string; closesAt: string }) => {
    onChange({
      ...data,
      openTime: preset.opensAt,
      closeTime: preset.closesAt,
    });
  };

  const isAllDays = data.openDays.length === 7;
  const isWeekdaysOnly =
    data.openDays.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => data.openDays.includes(d));

  const setAllDays = () => onChange({ ...data, openDays: [0, 1, 2, 3, 4, 5, 6] });
  const setWeekdays = () => onChange({ ...data, openDays: [1, 2, 3, 4, 5] });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Operating Schedule & Days
        </Text>
        <Text variant="muted" className="text-xs">
          Configure daily operational hours and active days when residents can access.
        </Text>
      </View>

      {/* Quick Schedule Presets */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Schedule Presets (Quick Apply)
          </Text>
          <Clock size={15} className="text-muted-foreground" />
        </View>

        <View className="flex-row flex-wrap gap-2">
          {SCHEDULE_PRESETS.map((p) => {
            const isSelected =
              data.openTime === p.opensAt && data.closeTime === p.closesAt;
            return (
              <Chip
                key={p.id}
                label={p.label}
                selected={isSelected}
                onPress={() => handleSelectPreset(p)}
              />
            );
          })}
        </View>

        {/* Operating Hours Inputs */}
        <View className="flex-row gap-3 mt-1">
          <View className="flex-1">
            <TextInput
              label="Opens At (HH:MM) *"
              placeholder="06:00"
              value={data.openTime}
              onChangeText={(val) => onChange({ ...data, openTime: val })}
              error={errors.openTime}
            />
          </View>
          <View className="flex-1">
            <TextInput
              label="Closes At (HH:MM) *"
              placeholder="22:00"
              value={data.closeTime}
              onChangeText={(val) => onChange({ ...data, closeTime: val })}
              error={errors.closeTime}
            />
          </View>
        </View>
      </View>

      {/* Active Days of Week */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Active Days of Week
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={setAllDays}
              className={cn(
                'px-2.5 py-1 rounded-full border',
                isAllDays ? 'bg-primary border-primary' : 'bg-muted/50 border-border'
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-bold',
                  isAllDays ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                All 7 Days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={setWeekdays}
              className={cn(
                'px-2.5 py-1 rounded-full border',
                isWeekdaysOnly ? 'bg-primary border-primary' : 'bg-muted/50 border-border'
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-bold',
                  isWeekdaysOnly ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                Mon - Fri
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {DAYS_NAMES.map((dayName, idx) => {
            const isSelected = data.openDays.includes(idx);
            return (
              <Chip
                key={dayName}
                label={dayName}
                selected={isSelected}
                onPress={() => toggleDay(idx)}
              />
            );
          })}
        </View>

        <View className="bg-muted/30 px-3 py-2 rounded-xl flex-row items-center gap-2">
          <CalendarCheck size={14} className="text-primary" />
          <Text className="text-xs text-muted-foreground font-medium">
            Facility is available on{' '}
            <Text className="text-foreground font-bold">{data.openDays.length} days</Text>{' '}
            per week.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default OperatingScheduleStep;
