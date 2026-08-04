import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { MOCK_SERVICE_TYPES } from '../../mocks/visitorMocks';
import { Wrench, Check } from 'lucide-react-native';

export interface ServiceTypeStepProps {
  selectedService: string;
  onSelectService: (serviceId: string) => void;
}

export const ServiceTypeStep: React.FC<ServiceTypeStepProps> = ({
  selectedService,
  onSelectService,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Select Service Category
        </Text>
        <Text variant="muted" className="text-xs">
          Categorize the staff role for community security tracking.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {MOCK_SERVICE_TYPES.map((service) => {
          const isSelected = selectedService === service.id;
          return (
            <TouchableOpacity
              key={service.id}
              onPress={() => onSelectService(service.id)}
              activeOpacity={0.7}
              className={`w-[47%] p-4 rounded-2xl border items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                <Wrench size={24} className="text-primary" />
              </View>
              <Text
                className={`text-xs font-bold text-center ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                {service.label}
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
