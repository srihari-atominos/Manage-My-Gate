import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Clock, ShieldCheck } from 'lucide-react-native';

export interface DeliveryValidityData {
  validityDuration: 'ONE_HOUR' | 'TWO_HOURS' | 'END_OF_DAY';
}

export interface DeliveryValidityStepProps {
  data: DeliveryValidityData;
  onChange: (data: DeliveryValidityData) => void;
}

const DELIVERY_VALIDITY_OPTIONS = [
  { id: 'ONE_HOUR', label: '1 Hour Pass', subtitle: 'Quick food delivery (Swiggy / Zomato / Blinkit)' },
  { id: 'TWO_HOURS', label: '2 Hours Pass', subtitle: 'Standard e-commerce courier delivery' },
  { id: 'END_OF_DAY', label: 'Valid Until Midnight Today', subtitle: 'Flexible full-day delivery window' },
];

export const DeliveryValidityStep: React.FC<DeliveryValidityStepProps> = ({
  data,
  onChange,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Pass Validity Duration
        </Text>
        <Text variant="muted" className="text-xs">
          Select how long the delivery pass code remains active.
        </Text>
      </View>

      <View className="gap-3">
        {DELIVERY_VALIDITY_OPTIONS.map((opt) => {
          const isSelected = data.validityDuration === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onChange({ validityDuration: opt.id as any })}
              activeOpacity={0.7}
              className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="gap-0.5 flex-1 pr-2">
                <Text
                  className={`text-sm font-bold ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {opt.label}
                </Text>
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
