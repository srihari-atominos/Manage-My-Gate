import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { PartyPopper, Tag, Calendar } from 'lucide-react-native';

export interface GroupVisitDetailsData {
  eventTitle: string;
  purpose: string;
  visitDate: string;
  expectedTime: string;
}

export interface GroupVisitDetailsStepProps {
  data: GroupVisitDetailsData;
  onChange: (data: GroupVisitDetailsData) => void;
  errors?: Partial<Record<keyof GroupVisitDetailsData, string>>;
}

export const GroupVisitDetailsStep: React.FC<GroupVisitDetailsStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const updateField = (field: keyof GroupVisitDetailsData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Group Event Details
        </Text>
        <Text variant="muted" className="text-xs">
          Provide basic details about the group gathering or party.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        <Input
          label="Event / Group Title"
          placeholder="e.g. Anniversary Party, Team Lunch"
          leftIcon={<PartyPopper size={18} className="text-muted-foreground" />}
          value={data.eventTitle}
          onChangeText={(val) => updateField('eventTitle', val)}
          error={errors.eventTitle}
        />

        <Input
          label="Event Description / Purpose"
          placeholder="e.g. Birthday celebration at Villa #402"
          leftIcon={<Tag size={18} className="text-muted-foreground" />}
          value={data.purpose}
          onChangeText={(val) => updateField('purpose', val)}
          error={errors.purpose}
        />

        <Input
          label="Visit Date (YYYY-MM-DD)"
          placeholder="2026-08-05"
          leftIcon={<Calendar size={18} className="text-muted-foreground" />}
          value={data.visitDate}
          onChangeText={(val) => updateField('visitDate', val)}
          error={errors.visitDate}
        />

        <Input
          label="Expected Arrival Time Slot"
          placeholder="e.g. 06:00 PM - 11:00 PM"
          value={data.expectedTime}
          onChangeText={(val) => updateField('expectedTime', val)}
          error={errors.expectedTime}
        />
      </View>
    </ScrollView>
  );
};
