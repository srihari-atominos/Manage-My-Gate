import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Clock, Sun, Sunset, Moon } from 'lucide-react-native';

export interface ServiceTimeWindowData {
  startTime: string;
  endTime: string;
  preset: 'MORNING' | 'EVENING' | 'FULL_DAY' | 'CUSTOM';
}

export interface ServiceTimeWindowStepProps {
  data: ServiceTimeWindowData;
  onChange: (data: ServiceTimeWindowData) => void;
}

const TIME_SLOT_PRESETS = [
  { id: 'MORNING', label: 'Morning Slot (08:00 AM - 01:00 PM)', startTime: '08:00 AM', endTime: '01:00 PM', icon: Sun },
  { id: 'EVENING', label: 'Evening Slot (04:00 PM - 09:00 PM)', startTime: '04:00 PM', endTime: '09:00 PM', icon: Sunset },
  { id: 'FULL_DAY', label: 'Full Work Day (07:00 AM - 08:00 PM)', startTime: '07:00 AM', endTime: '08:00 PM', icon: Clock },
  { id: 'CUSTOM', label: 'Custom Time Slot', startTime: '09:00 AM', endTime: '06:00 PM', icon: Clock },
];

export const ServiceTimeWindowStep: React.FC<ServiceTimeWindowStepProps> = ({
  data,
  onChange,
}) => {
  const handleSelectPreset = (preset: any) => {
    onChange({
      preset: preset.id,
      startTime: preset.startTime,
      endTime: preset.endTime,
    });
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Daily Allowed Time Window
        </Text>
        <Text variant="muted" className="text-xs">
          Select daily hours during which staff can pass through gate security.
        </Text>
      </View>

      <View className="gap-3">
        {TIME_SLOT_PRESETS.map((slot) => {
          const isSelected = data.preset === slot.id;
          const IconComp = slot.icon;
          return (
            <TouchableOpacity
              key={slot.id}
              onPress={() => handleSelectPreset(slot)}
              activeOpacity={0.7}
              className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <IconComp
                  size={20}
                  className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                />
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {slot.label}
                </Text>
              </View>

              <View
                className={`w-5 h-5 rounded-full border items-center justify-center ${
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                }`}
              >
                {isSelected ? <View className="w-2 h-2 rounded-full bg-white" /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {data.preset === 'CUSTOM' ? (
        <View className="bg-card border border-border rounded-2xl p-4 gap-3">
          <Input
            label="Allowed Start Time"
            placeholder="09:00 AM"
            leftIcon={<Clock size={18} className="text-muted-foreground" />}
            value={data.startTime}
            onChangeText={(val) => onChange({ ...data, startTime: val })}
          />
          <Input
            label="Allowed End Time"
            placeholder="06:00 PM"
            leftIcon={<Clock size={18} className="text-muted-foreground" />}
            value={data.endTime}
            onChangeText={(val) => onChange({ ...data, endTime: val })}
          />
        </View>
      ) : null}
    </ScrollView>
  );
};
