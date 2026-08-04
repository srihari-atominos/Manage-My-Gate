import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { User, Phone, Tag } from 'lucide-react-native';

export interface StaffDetailsData {
  staffName: string;
  phone: string;
  notes?: string;
}

export interface StaffDetailsStepProps {
  data: StaffDetailsData;
  onChange: (data: StaffDetailsData) => void;
  error?: string;
}

export const StaffDetailsStep: React.FC<StaffDetailsStepProps> = ({
  data,
  onChange,
  error,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Staff / Worker Details
        </Text>
        <Text variant="muted" className="text-xs">
          Enter personal identification details of daily household staff or technician.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        <Input
          label="Staff / Worker Name"
          placeholder="e.g. Sunita Devi, Ramesh Plumber"
          leftIcon={<User size={18} className="text-muted-foreground" />}
          value={data.staffName}
          onChangeText={(val) => onChange({ ...data, staffName: val })}
          error={error}
        />

        <Input
          label="Staff Contact Phone Number"
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          leftIcon={<Phone size={18} className="text-muted-foreground" />}
          value={data.phone}
          onChangeText={(val) => onChange({ ...data, phone: val })}
        />

        <Input
          label="Additional Work Note (Optional)"
          placeholder="e.g. Morning maid for Villa #402"
          leftIcon={<Tag size={18} className="text-muted-foreground" />}
          value={data.notes || ''}
          onChangeText={(val) => onChange({ ...data, notes: val })}
        />
      </View>
    </ScrollView>
  );
};
