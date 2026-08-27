import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect, DropdownOption } from '@/components/forms/DropdownSelect';
import { Icon } from '@/components/ui/icon';
import { Info } from 'lucide-react-native';

const TYPE_OPTIONS: DropdownOption[] = [
  { label: '🔁 Recurring Assessment (Monthly / Regular)', value: 'RECURRING' },
  { label: '⚡ One-Time Levy (Special Assessment)', value: 'ONE_TIME' },
  { label: '🏗️ Capital Repair Fund', value: 'CAPITAL_REPAIR' },
];

interface AssessmentTypeStepProps {
  name: string;
  onChangeName: (val: string) => void;
  type: string;
  onChangeType: (val: string) => void;
}

export const AssessmentTypeStep: React.FC<AssessmentTypeStepProps> = ({
  name,
  onChangeName,
  type,
  onChangeType,
}) => {
  return (
    <View className="gap-4">
      <View className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex-row items-center gap-2.5">
        <Icon as={Info} size={18} className="text-primary shrink-0" />
        <Text className="text-xs text-foreground font-medium flex-1">
          Give your assessment rule a clear name and select the type of fee collection.
        </Text>
      </View>

      {/* Assessment Rule Name */}
      <TextInput
        label="Assessment Rule Title *"
        placeholder="e.g. Monthly Maintenance Fee 2026"
        value={name}
        onChangeText={onChangeName}
      />

      {/* Assessment Type Dropdown */}
      <DropdownSelect
        label="Assessment Type *"
        options={TYPE_OPTIONS}
        value={type}
        onValueChange={onChangeType}
        placeholder="Select Assessment Type"
      />

      <View className="bg-card border border-border rounded-xl p-4 gap-2 mt-2">
        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Type Explanations
        </Text>
        {type === 'RECURRING' && (
          <Text className="text-xs text-foreground font-medium">
            • <Text className="font-bold">Recurring Assessment</Text>: Automatically generates invoices every month, quarter, or year according to your chosen cycle schedule.
          </Text>
        )}
        {type === 'ONE_TIME' && (
          <Text className="text-xs text-foreground font-medium">
            • <Text className="font-bold">One-Time Levy</Text>: A single invoice generated either immediately or scheduled for a specific date/time.
          </Text>
        )}
        {type === 'CAPITAL_REPAIR' && (
          <Text className="text-xs text-foreground font-medium">
            • <Text className="font-bold">Capital Repair Fund</Text>: Special project fees collected either as a single lump-sum or split into multi-month installment plans.
          </Text>
        )}
      </View>
    </View>
  );
};

export default AssessmentTypeStep;
