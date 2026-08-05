import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { PartyPopper, Tag, Ticket } from 'lucide-react-native';

export type TimePresetType = 'FULL_DAY' | 'EVENING' | 'LUNCH' | 'CUSTOM';

export interface GroupVisitDetailsData {
  eventTitle: string;
  purpose: string;
  visitDate: string;
  timePreset: TimePresetType;
  startTime: string;
  endTime: string;
  numberOfPasses: string;
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
  const updateField = (field: keyof GroupVisitDetailsData, value: any) => {
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
          Provide basic details about your group gathering and set total passes required.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-4">
        <Input
          label="Event / Group Title"
          placeholder="e.g. Housewarming Party, Team Lunch"
          leftIcon={<PartyPopper size={18} className="text-muted-foreground" />}
          value={data.eventTitle}
          onChangeText={(val) => updateField('eventTitle', val)}
          error={errors.eventTitle}
        />

        <Input
          label="Total Expected Passes / Tokens"
          placeholder="e.g. 20"
          keyboardType="numeric"
          leftIcon={<Ticket size={18} className="text-muted-foreground" />}
          value={data.numberOfPasses}
          onChangeText={(val) => updateField('numberOfPasses', val)}
          error={errors.numberOfPasses}
        />

        <Input
          label="Event Description / Purpose"
          placeholder="e.g. Celebration at Villa #402"
          leftIcon={<Tag size={18} className="text-muted-foreground" />}
          value={data.purpose}
          onChangeText={(val) => updateField('purpose', val)}
          error={errors.purpose}
        />
      </View>
    </ScrollView>
  );
};




