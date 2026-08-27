import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { MOCK_DELIVERY_PARTNERS } from '../../mocks/visitorMocks';
import { Package, Check } from 'lucide-react-native';

export interface DeliveryPartnerStepProps {
  selectedPartner: string;
  onSelectPartner: (partnerId: string) => void;
  customPartnerName?: string;
  onCustomPartnerChange?: (name: string) => void;
}

export const DeliveryPartnerStep: React.FC<DeliveryPartnerStepProps> = ({
  selectedPartner,
  onSelectPartner,
  customPartnerName,
  onCustomPartnerChange,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Select Delivery Partner
        </Text>
        <Text variant="muted" className="text-xs">
          Choose the courier, food, or grocery service arriving at the gate.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {MOCK_DELIVERY_PARTNERS.map((partner) => {
          const isSelected = selectedPartner === partner.id;
          return (
            <TouchableOpacity
              key={partner.id}
              onPress={() => onSelectPartner(partner.id)}
              activeOpacity={0.7}
              className={`w-[47%] p-4 rounded-2xl border items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                <Package size={24} className="text-primary" />
              </View>
              <Text
                className={`text-sm font-bold text-center ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                {partner.label}
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

      {selectedPartner === 'other' && (
        <View className="gap-2 bg-card border border-primary/40 rounded-2xl p-4 mt-1">
          <Text className="text-xs font-bold text-primary">Specify Delivery Company / Brand Name</Text>
          <Input
            placeholder="e.g. Country Delight, Daily Milk, Local Courier"
            value={customPartnerName || ''}
            onChangeText={(txt) => onCustomPartnerChange && onCustomPartnerChange(txt)}
            autoFocus
          />
          <Text variant="muted" className="text-xs">
            This company name will be displayed to security guards at the gate barrier.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};
