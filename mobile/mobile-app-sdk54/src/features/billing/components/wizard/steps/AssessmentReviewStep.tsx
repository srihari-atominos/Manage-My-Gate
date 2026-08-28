import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { Icon } from '@/components/ui/icon';
import { Landmark, Calendar, Calculator, Users, CheckCircle2, ShieldCheck } from 'lucide-react-native';

interface AssessmentReviewStepProps {
  name: string;
  type: string;
  billingCycle: string;
  genDayOption: string;
  customDay: string;
  selectedDays: number[];
  triggerMode: string;
  scheduledDate: string;
  scheduledTime: string;
  collectionMethod: string;
  totalInstallments: string;
  calcMethod: string;
  flatAmount: string;
  ratePerSqFt: string;
  tieredRates: Record<string, string>;
  scopeType: string;
  checkedRoles: string[];
  roleNamesMap: Record<string, string>;
  selectedIds: string[];
  selectedUnitTypes: string[];
}

export const AssessmentReviewStep: React.FC<AssessmentReviewStepProps> = ({
  name,
  type,
  billingCycle,
  genDayOption,
  customDay,
  selectedDays,
  triggerMode,
  scheduledDate,
  scheduledTime,
  collectionMethod,
  totalInstallments,
  calcMethod,
  flatAmount,
  ratePerSqFt,
  tieredRates,
  scopeType,
  checkedRoles,
  roleNamesMap,
  selectedIds,
  selectedUnitTypes,
}) => {
  const isCapitalRepair = type === 'CAPITAL_REPAIR';
  const isOneTime = type === 'ONE_TIME' || (isCapitalRepair && collectionMethod === 'LUMP_SUM');
  const isRecurring = type === 'RECURRING' || (isCapitalRepair && collectionMethod === 'INSTALLMENT');

  const generationDayDisplay =
    genDayOption === 'FIRST'
      ? '1st Day of Month'
      : genDayOption === 'LAST'
      ? 'Last Day of Month'
      : `Day ${customDay || '1'} of Month`;

  const calcRateDisplay =
    calcMethod === 'FLAT_RATE'
      ? `₹${Number(flatAmount || 0).toLocaleString('en-IN')} Flat per Unit`
      : calcMethod === 'PER_SQ_FT'
      ? `₹${ratePerSqFt || 0} / sq.ft.`
      : 'Tiered BHK Rates Configured';

  const roleLabels = checkedRoles.map((id) => roleNamesMap[id] || 'Resident Role').join(', ');

  return (
    <View className="gap-4">
      <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex-row items-center gap-2.5">
        <Icon as={ShieldCheck} size={20} className="text-emerald-600 shrink-0" />
        <Text className="text-xs text-emerald-800 font-bold flex-1">
          Review your assessment calculation rules and target scope before creating.
        </Text>
      </View>

      {/* Main Review Card */}
      <View className="bg-card border border-border rounded-xl p-4 gap-3 shadow-sm">
        <View className="flex-row items-start justify-between border-b border-border pb-3">
          <View className="flex-1 me-2">
            <Text className="text-lg font-extrabold text-foreground">{name}</Text>
            <Text className="text-xs text-muted-foreground font-semibold">
              {type} • {isOneTime ? 'AD_HOC' : billingCycle}
            </Text>
          </View>
          <StatusBadge label="READY TO CREATE" variant="success" dot />
        </View>

        {/* Section 1: Schedule Summary */}
        <DetailSection title="Schedule & Frequency" iconName="Calendar">
          <DetailRow label="Assessment Type" value={type} />
          {isRecurring && (
            <>
              <DetailRow label="Billing Cycle" value={billingCycle} />
              {billingCycle === 'WEEKLY' ? (
                <DetailRow label="Generation Days" value={`${selectedDays.length} Days Selected`} />
              ) : (
                <DetailRow label="Generation Day" value={generationDayDisplay} />
              )}
            </>
          )}

          {isOneTime && (
            <>
              <DetailRow label="Trigger Mode" value={triggerMode} />
              {triggerMode === 'SCHEDULED' && (
                <DetailRow
                  label="Scheduled Date & Time"
                  value={`${scheduledDate} at ${scheduledTime}`}
                />
              )}
            </>
          )}

          {isCapitalRepair && (
            <>
              <DetailRow label="Collection Method" value={collectionMethod} />
              {collectionMethod === 'INSTALLMENT' && (
                <DetailRow label="Total Installments" value={`${totalInstallments} Months`} />
              )}
            </>
          )}
        </DetailSection>

        {/* Section 2: Calculation Summary */}
        <DetailSection title="Calculation Formula" iconName="Calculator">
          <DetailRow label="Formula Type" value={calcMethod.replace(/_/g, ' ')} />
          <DetailRow label="Assessment Rate" value={calcRateDisplay} />
        </DetailSection>

        {/* Section 3: Target Scope & Roles Summary */}
        <DetailSection title="Target Scope & Audience" iconName="Users">
          <DetailRow label="Target Scope" value={scopeType.replace(/_/g, ' ')} />
          {scopeType === 'UNIT_TYPE' && (
            <DetailRow label="Selected Unit Types" value={selectedUnitTypes.join(', ') || 'None'} />
          )}
          {['VILLA_BLOCK', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'].includes(scopeType) && (
            <DetailRow label="Selected Scope Items" value={`${selectedIds.length} Selected`} />
          )}
          <DetailRow label="Charge To Roles" value={roleLabels || 'All Resident Roles'} />
        </DetailSection>
      </View>
    </View>
  );
};

export default AssessmentReviewStep;
