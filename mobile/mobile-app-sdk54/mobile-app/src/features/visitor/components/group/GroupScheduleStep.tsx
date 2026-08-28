import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Sun, Sunset, Sparkles } from 'lucide-react-native';
import { GroupVisitDetailsData, TimePresetType } from './GroupVisitDetailsStep';

export interface GroupScheduleStepProps {
  data: GroupVisitDetailsData;
  onChange: (data: GroupVisitDetailsData) => void;
  errors?: Partial<Record<keyof GroupVisitDetailsData, string>>;
}

const TIME_PRESETS = [
  { id: 'FULL_DAY', label: 'Full Event Day', timeRange: '07:00 AM - 11:59 PM', startTime: '07:00 AM', endTime: '11:59 PM', icon: Sparkles },
  { id: 'EVENING', label: 'Evening Party', timeRange: '04:00 PM - 11:00 PM', startTime: '04:00 PM', endTime: '11:00 PM', icon: Sunset },
  { id: 'LUNCH', label: 'Lunch / Day Event', timeRange: '11:00 AM - 04:00 PM', startTime: '11:00 AM', endTime: '04:00 PM', icon: Sun },
  { id: 'CUSTOM', label: 'Custom Hours', timeRange: 'Specify exact times', startTime: '09:00 AM', endTime: '06:00 PM', icon: Clock },
];

const TIME_PILLS = ['08:00 AM', '11:00 AM', '02:00 PM', '05:00 PM', '08:00 PM', '11:00 PM'];

export const GroupScheduleStep: React.FC<GroupScheduleStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const updateField = (field: keyof GroupVisitDetailsData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const handleSelectPreset = (preset: typeof TIME_PRESETS[number]) => {
    onChange({
      ...data,
      timePreset: preset.id as TimePresetType,
      startTime: preset.startTime,
      endTime: preset.endTime,
    });
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Event Schedule & Time Window
        </Text>
        <Text variant="muted" className="text-xs">
          Select date and time range for your group event.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        {/* Visit Date Input */}
        <Input
          label="Event Date (YYYY-MM-DD)"
          placeholder="2026-08-05"
          leftIcon={<Calendar size={18} className="text-muted-foreground" />}
          value={data.visitDate}
          onChangeText={(val) => updateField('visitDate', val)}
          error={errors.visitDate}
        />

        {/* Time Range Preset Selection */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-foreground">Event Time Slot</Text>
          <View className="gap-2">
            {TIME_PRESETS.map((preset) => {
              const isSelected = (data.timePreset || 'FULL_DAY') === preset.id;
              const IconComp = preset.icon;
              return (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => handleSelectPreset(preset)}
                  activeOpacity={0.7}
                  className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border/70'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <IconComp
                      size={18}
                      className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                    />
                    <View>
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {preset.label}
                      </Text>
                      <Text variant="muted" className="text-[11px]">
                        {preset.timeRange}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`w-4 h-4 rounded-full border items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    }`}
                  >
                    {isSelected ? <View className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Custom Time Selection (Stacked Full Width) */}
        {data.timePreset === 'CUSTOM' && (
          <View className="gap-3 pt-2 border-t border-border/50">
            <Input
              label="Start Time"
              placeholder="e.g. 06:00 PM"
              leftIcon={<Clock size={18} className="text-muted-foreground" />}
              value={data.startTime}
              onChangeText={(val) => updateField('startTime', val)}
              error={errors.startTime}
            />

            {/* Quick Time Pills for Start Time */}
            <View className="flex-row flex-wrap gap-2">
              {TIME_PILLS.map((pill) => (
                <TouchableOpacity
                  key={`start-${pill}`}
                  onPress={() => updateField('startTime', pill)}
                  className={`px-3 py-1.5 rounded-lg border text-xs ${
                    data.startTime === pill ? 'bg-primary border-primary' : 'bg-background border-border'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${data.startTime === pill ? 'text-white' : 'text-foreground'}`}>
                    {pill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="End Time"
              placeholder="e.g. 11:00 PM"
              leftIcon={<Clock size={18} className="text-muted-foreground" />}
              value={data.endTime}
              onChangeText={(val) => updateField('endTime', val)}
              error={errors.endTime}
            />

            {/* Quick Time Pills for End Time */}
            <View className="flex-row flex-wrap gap-2">
              {TIME_PILLS.map((pill) => (
                <TouchableOpacity
                  key={`end-${pill}`}
                  onPress={() => updateField('endTime', pill)}
                  className={`px-3 py-1.5 rounded-lg border text-xs ${
                    data.endTime === pill ? 'bg-primary border-primary' : 'bg-background border-border'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${data.endTime === pill ? 'text-white' : 'text-foreground'}`}>
                    {pill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
