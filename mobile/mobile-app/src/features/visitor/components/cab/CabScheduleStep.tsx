import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Clock, Zap } from 'lucide-react-native';

export interface CabScheduleData {
  arrivalWindow: 'IMMEDIATE' | 'THIRTY_MINS' | 'ONE_HOUR' | 'TODAY_LATER';
}

export interface CabScheduleStepProps {
  data: CabScheduleData;
  onChange: (data: CabScheduleData) => void;
}

const CAB_SCHEDULE_OPTIONS = [
  { id: 'IMMEDIATE', label: 'Arriving Now (Next 15 Mins)', subtitle: 'Immediate auto-approval' },
  { id: 'THIRTY_MINS', label: 'Next 30 Minutes', subtitle: 'Cab booked & on the way' },
  { id: 'ONE_HOUR', label: 'Next 1 Hour', subtitle: 'Scheduled pickup / drop' },
  { id: 'TODAY_LATER', label: 'Later Today (Valid 4 Hours)', subtitle: 'Flexible time window' },
];

export const CabScheduleStep: React.FC<CabScheduleStepProps> = ({
  data,
  onChange,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Expected Arrival Window
        </Text>
        <Text variant="muted" className="text-xs">
          Select how soon the cab or auto will reach the gate barrier.
        </Text>
      </View>

      <View className="gap-3">
        {CAB_SCHEDULE_OPTIONS.map((opt) => {
          const isSelected = data.arrivalWindow === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onChange({ arrivalWindow: opt.id as any })}
              activeOpacity={0.7}
              className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="gap-0.5 flex-1 pr-2">
                <View className="flex-row items-center gap-2">
                  {opt.id === 'IMMEDIATE' ? (
                    <Zap size={16} className="text-amber-500" />
                  ) : (
                    <Clock size={16} className="text-muted-foreground" />
                  )}
                  <Text
                    className={`text-sm font-bold ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </View>
                <Text variant="muted" className="text-xs">
                  {opt.subtitle}
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
    </ScrollView>
  );
};
