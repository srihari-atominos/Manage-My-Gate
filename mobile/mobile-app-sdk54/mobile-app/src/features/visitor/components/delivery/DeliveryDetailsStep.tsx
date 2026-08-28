import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Package, Hash, ShieldCheck, DoorOpen } from 'lucide-react-native';

export interface DeliveryDetailsData {
  orderId: string;
  packageCount: string;
  deliveryAction: 'DOORSTEP' | 'LEAVE_AT_GATE';
  instructions: string;
}

export interface DeliveryDetailsStepProps {
  data: DeliveryDetailsData;
  onChange: (data: DeliveryDetailsData) => void;
}

export const DeliveryDetailsStep: React.FC<DeliveryDetailsStepProps> = ({
  data,
  onChange,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Delivery Order Details
        </Text>
        <Text variant="muted" className="text-xs">
          Specify order reference number and entry preference.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        {/* Entry Preference */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Delivery Location</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => onChange({ ...data, deliveryAction: 'DOORSTEP' })}
              activeOpacity={0.8}
              className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                data.deliveryAction === 'DOORSTEP'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              <DoorOpen
                size={20}
                className={data.deliveryAction === 'DOORSTEP' ? 'text-primary' : 'text-muted-foreground'}
              />
              <Text
                className={`text-xs font-bold ${
                  data.deliveryAction === 'DOORSTEP' ? 'text-primary' : 'text-foreground'
                }`}
              >
                Doorstep Delivery
              </Text>
              <Text variant="muted" className="text-[10px] text-center">
                Allow agent to villa door
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onChange({ ...data, deliveryAction: 'LEAVE_AT_GATE' })}
              activeOpacity={0.8}
              className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                data.deliveryAction === 'LEAVE_AT_GATE'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              <ShieldCheck
                size={20}
                className={data.deliveryAction === 'LEAVE_AT_GATE' ? 'text-primary' : 'text-muted-foreground'}
              />
              <Text
                className={`text-xs font-bold ${
                  data.deliveryAction === 'LEAVE_AT_GATE' ? 'text-primary' : 'text-foreground'
                }`}
              >
                Leave at Gate Desk
              </Text>
              <Text variant="muted" className="text-[10px] text-center">
                Collect from security gate
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input
          label="Order / Tracking ID (Optional)"
          placeholder="e.g. #ORD-992014"
          leftIcon={<Hash size={18} className="text-muted-foreground" />}
          value={data.orderId}
          onChangeText={(val) => onChange({ ...data, orderId: val })}
        />

        <Input
          label="Number of Packages (Optional)"
          placeholder="1"
          keyboardType="numeric"
          leftIcon={<Package size={18} className="text-muted-foreground" />}
          value={data.packageCount}
          onChangeText={(val) => onChange({ ...data, packageCount: val })}
        />

        <Input
          label="Delivery Instructions for Security"
          placeholder="e.g. Ring bell or drop parcel in lobby box"
          value={data.instructions}
          onChangeText={(val) => onChange({ ...data, instructions: val })}
        />
      </View>
    </ScrollView>
  );
};
