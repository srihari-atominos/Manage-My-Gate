import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Play, Edit, Trash2 } from 'lucide-react-native';

export interface AssessmentRuleCardProps {
  rule: {
    _id?: string;
    id?: string;
    name: string;
    type?: string;
    billingCycle?: string;
    isActive?: boolean;
    generationDay?: number | string;
    calculationMethod?: {
      type?: string;
      flatAmount?: number;
      ratePerSqFt?: number;
      tiers?: any[];
    };
  };
  onRun: (rule: any) => void;
  onEdit: (rule: any) => void;
  onDelete: (rule: any) => void;
  className?: string;
}

export const AssessmentRuleCard: React.FC<AssessmentRuleCardProps> = ({
  rule,
  onRun,
  onEdit,
  onDelete,
  className = '',
}) => {
  const calcType = rule.calculationMethod?.type || 'FLAT_RATE';
  const rateDisplay =
    calcType === 'PER_SQ_FT'
      ? `₹${rule.calculationMethod?.ratePerSqFt || 0} / sq.ft`
      : `₹${(rule.calculationMethod?.flatAmount || 0).toLocaleString('en-IN')} Flat`;

  return (
    <ListCard
      title={rule.name}
      subtitle={`${rule.billingCycle || 'MONTHLY'} • ${rule.type || 'RECURRING'}`}
      leftIcon="Sliders"
      leftIconBgColor="bg-primary/10"
      status={{
        label: rule.isActive !== false ? 'ACTIVE' : 'INACTIVE',
        variant: rule.isActive !== false ? 'success' : 'neutral',
      }}
      className={className}
    >
      {/* Calculation Formula Details Box */}
      <View className="bg-muted/40 rounded-xl p-3 my-2 gap-2 border border-border/50">
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-muted-foreground font-semibold">Calculation Method:</Text>
          <Text className="text-xs font-bold text-foreground">{calcType.replace(/_/g, ' ')}</Text>
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-muted-foreground font-semibold">Assessment Rate:</Text>
          <Text className="text-xs font-extrabold text-primary">{rateDisplay}</Text>
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-muted-foreground font-semibold">Generation Day:</Text>
          <Text className="text-xs font-bold text-foreground">Day {rule.generationDay || '1'} of month</Text>
        </View>
      </View>

      {/* Action CTAs */}
      <View className="flex-row gap-2 mt-1">
        <Button
          variant="default"
          size="sm"
          className="flex-1 bg-emerald-600 active:bg-emerald-700 rounded-xl"
          onPress={() => onRun(rule)}
          accessibilityRole="button"
          accessibilityLabel={`Run billing for ${rule.name}`}
        >
          <Icon as={Play} size={14} className="text-white me-1.5" />
          <Text className="font-bold text-xs text-white">Run Billing</Text>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-border bg-card px-3 rounded-xl"
          onPress={() => onEdit(rule)}
          accessibilityRole="button"
          accessibilityLabel={`Edit assessment rule ${rule.name}`}
        >
          <Icon as={Edit} size={14} className="text-foreground" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-destructive/30 bg-destructive/10 px-3 rounded-xl"
          onPress={() => onDelete(rule)}
          accessibilityRole="button"
          accessibilityLabel={`Delete assessment rule ${rule.name}`}
        >
          <Icon as={Trash2} size={14} className="text-destructive" />
        </Button>
      </View>
    </ListCard>
  );
};

export default AssessmentRuleCard;
