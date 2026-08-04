import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react-native';

export interface ServiceDateRangeData {
  startDate: string;
  endDate: string;
}

export interface ServiceDateRangeStepProps {
  data: ServiceDateRangeData;
  onChange: (data: ServiceDateRangeData) => void;
}

export const ServiceDateRangeStep: React.FC<ServiceDateRangeStepProps> = ({
  data,
  onChange,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Pass Duration & Validity Period
        </Text>
        <Text variant="muted" className="text-xs">
          Set start date and pass expiration date for daily staff.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        <Input
          label="Pass Start Date (YYYY-MM-DD)"
          placeholder="2026-08-01"
          leftIcon={<Calendar size={18} className="text-muted-foreground" />}
          value={data.startDate}
          onChangeText={(val) => onChange({ ...data, startDate: val })}
        />

        <Input
          label="Pass Expiration / End Date (YYYY-MM-DD)"
          placeholder="2026-12-31"
          leftIcon={<Calendar size={18} className="text-muted-foreground" />}
          value={data.endDate}
          onChangeText={(val) => onChange({ ...data, endDate: val })}
        />
      </View>
    </ScrollView>
  );
};
