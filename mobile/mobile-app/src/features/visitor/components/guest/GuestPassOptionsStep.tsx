import React from 'react';
import { View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Car, ShieldAlert, CheckCircle2 } from 'lucide-react-native';

export interface GuestPassOptionsData {
  entryMode: 'SINGLE' | 'MULTIPLE';
  vehicleNo: string;
  gateInstructions: string;
}

export interface GuestPassOptionsStepProps {
  data: GuestPassOptionsData;
  onChange: (data: GuestPassOptionsData) => void;
}

export const GuestPassOptionsStep: React.FC<GuestPassOptionsStepProps> = ({
  data,
  onChange,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Pass Entry Options
        </Text>
        <Text variant="muted" className="text-xs">
          Configure entry frequency, vehicle details, and special gate security instructions.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        {/* Entry Mode Toggle */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Entry Mode</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => onChange({ ...data, entryMode: 'SINGLE' })}
              activeOpacity={0.8}
              className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                data.entryMode === 'SINGLE'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  data.entryMode === 'SINGLE' ? 'text-primary' : 'text-foreground'
                }`}
              >
                Single Entry
              </Text>
              <Text variant="muted" className="text-[10px] text-center">
                Pass expires after 1 entry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onChange({ ...data, entryMode: 'MULTIPLE' })}
              activeOpacity={0.8}
              className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                data.entryMode === 'MULTIPLE'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  data.entryMode === 'MULTIPLE' ? 'text-primary' : 'text-foreground'
                }`}
              >
                Multiple Entries
              </Text>
              <Text variant="muted" className="text-[10px] text-center">
                Valid for duration window
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Number */}
        <Input
          label="Visitor Vehicle Number (Optional)"
          placeholder="e.g. KA-01-AB-1234"
          leftIcon={<Car size={18} className="text-muted-foreground" />}
          value={data.vehicleNo}
          onChangeText={(val) => onChange({ ...data, vehicleNo: val.toUpperCase() })}
        />

        {/* Special Gate Instructions */}
        <Input
          label="Special Security Instructions (Optional)"
          placeholder="e.g. Please direct vehicle to Visitor Parking Slot 14"
          leftIcon={<ShieldAlert size={18} className="text-muted-foreground" />}
          value={data.gateInstructions}
          onChangeText={(val) => onChange({ ...data, gateInstructions: val })}
        />
      </View>
    </ScrollView>
  );
};
