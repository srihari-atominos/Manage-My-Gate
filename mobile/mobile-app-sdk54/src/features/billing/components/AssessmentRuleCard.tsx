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
    lastRunAt?: string | Date | null;
    lastBilledPeriod?: string | null;
    lastRunStats?: {
      created?: number;
      duplicatesSkipped?: number;
      totalTargeted?: number;
    };
    calculationMethod?: {
      type?: string;
      flatAmount?: number;
      ratePerSqFt?: number;
      tiers?: any[];
      tieredRates?: Record<string, any>;
    };
    targetScope?: {
      type?: string;
      scopeIds?: string[];
      targetRoleIds?: string[];
      targetRole?: string;
    };
  };
  onPress?: (rule: any) => void;
  onRun: (rule: any) => void;
  onEdit: (rule: any) => void;
  onDelete: (rule: any) => void;
  className?: string;
}

export function getCurrentPeriodString(billingCycle?: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  if (billingCycle === 'WEEKLY') {
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) {
      target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const weekYear = new Date(firstThursday).getUTCFullYear();
    return `${weekYear}-W${String(weekNum).padStart(2, '0')}`;
  }
  if (billingCycle === 'QUARTERLY') {
    const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  }
  return `${year}-${month}`;
}

export const AssessmentRuleCard: React.FC<AssessmentRuleCardProps> = ({
  rule,
  onPress,
  onRun,
  onEdit,
  onDelete,
  className = '',
}) => {
  const calcType = rule.calculationMethod?.type || 'FLAT_RATE';
  const rateDisplay =
    calcType === 'PER_SQ_FT'
      ? `₹${rule.calculationMethod?.ratePerSqFt || 0} / sq.ft`
      : calcType === 'TIERED_BHK'
      ? 'Tiered Rates by BHK'
      : `₹${(rule.calculationMethod?.flatAmount || 0).toLocaleString('en-IN')} Flat`;

  const currentPeriod = getCurrentPeriodString(rule.billingCycle);
  const isCurrentPeriodBilled = Boolean(rule.lastBilledPeriod && rule.lastBilledPeriod === currentPeriod);

  return (
    <ListCard
      title={rule.name}
      subtitle={`${rule.billingCycle || 'MONTHLY'} • ${rule.type || 'RECURRING'}`}
      leftIcon="Sliders"
      leftIconBgColor="bg-primary/10"
      onPress={() => onPress && onPress(rule)}
      status={{
        label: rule.isActive !== false ? 'ACTIVE' : 'INACTIVE',
        variant: rule.isActive !== false ? 'success' : 'neutral',
      }}
      className={className}
    >
      {/* Calculation Formula & Run Status Details Box */}
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

        {/* ── LAST RUN & CYCLE STATUS ─────────────────────────────────── */}
        <View className="border-t border-border/60 pt-2 mt-0.5">
          {isCurrentPeriodBilled ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                ✅ Billed for {currentPeriod}
              </Text>
              <Text className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {rule.lastRunStats?.created !== undefined ? `${rule.lastRunStats.created} Invoices` : 'Completed'}
              </Text>
            </View>
          ) : rule.lastBilledPeriod ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground font-medium">
                Last Run: <Text className="font-bold text-foreground">{rule.lastBilledPeriod}</Text>
              </Text>
              <View className="bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {currentPeriod} Pending
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground font-medium">
                Status: <Text className="font-bold text-foreground">Never Run</Text>
              </Text>
              <View className="bg-muted px-2 py-0.5 rounded-full border border-border">
                <Text className="text-[10px] font-semibold text-muted-foreground">
                  {currentPeriod} Ready
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Action CTAs */}
      <View className="flex-row gap-2 mt-1">
        <Button
          variant="default"
          size="sm"
          className={`flex-1 rounded-xl ${
            isCurrentPeriodBilled
              ? 'bg-slate-700 active:bg-slate-800'
              : 'bg-emerald-600 active:bg-emerald-700'
          }`}
          onPress={() => onRun(rule)}
          accessibilityRole="button"
          accessibilityLabel={`Run billing for ${rule.name}`}
        >
          <Icon as={Play} size={14} className="text-white me-1.5" />
          <Text className="font-bold text-xs text-white">
            {isCurrentPeriodBilled ? 'Re-run Billing' : 'Run Billing'}
          </Text>
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

