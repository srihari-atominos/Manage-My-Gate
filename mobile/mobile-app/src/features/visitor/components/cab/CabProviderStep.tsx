import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { MOCK_CAB_PROVIDERS } from '../../mocks/visitorMocks';
import { Car, Bike, Check } from 'lucide-react-native';

export interface CabProviderStepProps {
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
}

export const CabProviderStep: React.FC<CabProviderStepProps> = ({
  selectedProvider,
  onSelectProvider,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Select Cab / Auto Provider
        </Text>
        <Text variant="muted" className="text-xs">
          Choose the taxi service or delivery provider entering the gate.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {MOCK_CAB_PROVIDERS.map((provider) => {
          const isSelected = selectedProvider === provider.id;
          return (
            <TouchableOpacity
              key={provider.id}
              onPress={() => onSelectProvider(provider.id)}
              activeOpacity={0.7}
              className={`w-[47%] p-4 rounded-2xl border items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                <Car size={24} className="text-primary" />
              </View>
              <Text
                className={`text-sm font-bold text-center ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                {provider.label}
              </Text>
              {isSelected ? (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <Check size={12} color="#fff" />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};
