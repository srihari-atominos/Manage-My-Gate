import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect, DropdownOption } from '@/components/forms/DropdownSelect';
import { DayOfMonthPicker } from '@/components/forms/DayOfMonthPicker';
import { DatePicker } from '@/components/common/DatePicker';
import { TimePicker } from '@/components/common/TimePicker';
import { Icon } from '@/components/ui/icon';
import { Calendar, Clock, Layers, AlertCircle } from 'lucide-react-native';

const CYCLE_OPTIONS: DropdownOption[] = [
  { label: 'Monthly Billing', value: 'MONTHLY' },
  { label: 'Quarterly Billing', value: 'QUARTERLY' },
  { label: 'Annual Billing', value: 'ANNUALLY' },
  { label: 'Ad-Hoc (One-Time)', value: 'AD_HOC' },
];



interface AssessmentScheduleStepProps {
  type: string;
  billingCycle: string;
  onChangeBillingCycle: (val: string) => void;
  genDayOption: string;
  onChangeGenDayOption: (val: string) => void;
  customDay: string;
  onChangeCustomDay: (val: string) => void;
  selectedDays: number[];
  onToggleDay: (idx: number) => void;
  triggerMode: string;
  onChangeTriggerMode: (val: string) => void;
  scheduledDate: string;
  onChangeScheduledDate: (val: string) => void;
  scheduledTime: string;
  onChangeScheduledTime: (val: string) => void;
  collectionMethod: string;
  onChangeCollectionMethod: (val: string) => void;
  totalInstallments: string;
  onChangeTotalInstallments: (val: string) => void;
}

export const AssessmentScheduleStep: React.FC<AssessmentScheduleStepProps> = ({
  type,
  billingCycle,
  onChangeBillingCycle,
  genDayOption,
  onChangeGenDayOption,
  customDay,
  onChangeCustomDay,
  selectedDays,
  onToggleDay,
  triggerMode,
  onChangeTriggerMode,
  scheduledDate,
  onChangeScheduledDate,
  scheduledTime,
  onChangeScheduledTime,
  collectionMethod,
  onChangeCollectionMethod,
  totalInstallments,
  onChangeTotalInstallments,
}) => {
  const isCapitalRepair = type === 'CAPITAL_REPAIR';
  const isOneTime = type === 'ONE_TIME' || (isCapitalRepair && collectionMethod === 'LUMP_SUM');
  const isRecurring = type === 'RECURRING' || (isCapitalRepair && collectionMethod === 'INSTALLMENT');

  return (
    <View className="gap-4">
      {/* ── CAPITAL REPAIR Collection Method Selection ─────────────────── */}
      {isCapitalRepair && (
        <View className="bg-card border border-border rounded-xl p-4 gap-3">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Capital Repair Collection Method
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => onChangeCollectionMethod('LUMP_SUM')}
              activeOpacity={0.7}
              className={`flex-1 p-3 rounded-xl border items-center justify-center ${
                collectionMethod === 'LUMP_SUM'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  collectionMethod === 'LUMP_SUM' ? 'text-primary' : 'text-foreground'
                }`}
              >
                💰 Lump Sum
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">One-time collection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onChangeCollectionMethod('INSTALLMENT')}
              activeOpacity={0.7}
              className={`flex-1 p-3 rounded-xl border items-center justify-center ${
                collectionMethod === 'INSTALLMENT'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  collectionMethod === 'INSTALLMENT' ? 'text-primary' : 'text-foreground'
                }`}
              >
                📆 Installment Plan
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">Split over months</Text>
            </TouchableOpacity>
          </View>

          {collectionMethod === 'INSTALLMENT' && (
            <View className="mt-2">
              <TextInput
                label="Total Installments Count *"
                placeholder="e.g. 4"
                keyboardType="number-pad"
                value={totalInstallments}
                onChangeText={onChangeTotalInstallments}
              />
              <Text className="text-[11px] text-muted-foreground mt-1 me-1">
                Minimum 2 installments required. Total amount will be divided evenly across installments.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── RECURRING CYCLE & GENERATION DAY CONFIGURATION ─────────────── */}
      {isRecurring && (
        <View className="gap-4">
          <DropdownSelect
            label="Billing Cycle *"
            options={CYCLE_OPTIONS}
            value={billingCycle}
            onValueChange={onChangeBillingCycle}
            placeholder="Select Billing Cycle"
          />

          <View className="bg-card border border-border rounded-xl p-4 gap-3">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Monthly Generation Day
              </Text>

              <TouchableOpacity
                onPress={() => onChangeGenDayOption('FIRST')}
                activeOpacity={0.7}
                className={`p-3 rounded-xl border flex-row items-center justify-between ${
                  genDayOption === 'FIRST'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background'
                }`}
              >
                <Text className="text-xs font-bold text-foreground">First Day of Month (1st)</Text>
                {genDayOption === 'FIRST' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onChangeGenDayOption('LAST')}
                activeOpacity={0.7}
                className={`p-3 rounded-xl border flex-row items-center justify-between ${
                  genDayOption === 'LAST'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background'
                }`}
              >
                <Text className="text-xs font-bold text-foreground">Last Day of Month</Text>
                {genDayOption === 'LAST' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onChangeGenDayOption('CUSTOM')}
                activeOpacity={0.7}
                className={`p-3 rounded-xl border flex-row items-center justify-between ${
                  genDayOption === 'CUSTOM'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background'
                }`}
              >
                <Text className="text-xs font-bold text-foreground">Custom Date (Day 1 - 28)</Text>
                {genDayOption === 'CUSTOM' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </TouchableOpacity>

              {genDayOption === 'CUSTOM' && (
                <View className="mt-2">
                  <DayOfMonthPicker
                    label="Select Generation Date (1 - 28) *"
                    value={customDay || '1'}
                    onChange={onChangeCustomDay}
                    maxDay={28}
                  />
                </View>
              )}
            </View>
        </View>
      )}

      {/* ── ONE-TIME / LUMP SUM TRIGGER MODE ──────────────────────────── */}
      {isOneTime && (
        <View className="bg-card border border-border rounded-xl p-4 gap-3">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Generation Schedule Trigger Mode
          </Text>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => onChangeTriggerMode('IMMEDIATE')}
              activeOpacity={0.7}
              className={`flex-1 p-3 rounded-xl border items-center justify-center ${
                triggerMode === 'IMMEDIATE'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  triggerMode === 'IMMEDIATE' ? 'text-primary' : 'text-foreground'
                }`}
              >
                ⚡ Immediate
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">Generate right away</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onChangeTriggerMode('SCHEDULED')}
              activeOpacity={0.7}
              className={`flex-1 p-3 rounded-xl border items-center justify-center ${
                triggerMode === 'SCHEDULED'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  triggerMode === 'SCHEDULED' ? 'text-primary' : 'text-foreground'
                }`}
              >
                📅 Scheduled Date
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">Set date & time</Text>
            </TouchableOpacity>
          </View>

          {triggerMode === 'SCHEDULED' && (
            <View className="gap-3 mt-2">
              <DatePicker
                label="Scheduled Date *"
                value={(() => {
                  if (!scheduledDate) return null;
                  const parts = scheduledDate.split('-');
                  if (parts.length === 3) {
                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    return isNaN(d.getTime()) ? null : d;
                  }
                  const dObj = new Date(scheduledDate);
                  return isNaN(dObj.getTime()) ? null : dObj;
                })()}
                onChange={(d: Date) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  onChangeScheduledDate(`${y}-${m}-${day}`);
                }}
                placeholder="Select Date"
              />
              <TimePicker
                label="Scheduled Time *"
                value={(() => {
                  if (!scheduledTime) return null;
                  const match = scheduledTime.match(/(\d{1,2}):(\d{2})/);
                  if (match) {
                    const d = new Date();
                    d.setHours(Number(match[1]), Number(match[2]), 0, 0);
                    return d;
                  }
                  return null;
                })()}
                onChange={(d: Date) => {
                  const h = String(d.getHours()).padStart(2, '0');
                  const m = String(d.getMinutes()).padStart(2, '0');
                  onChangeScheduledTime(`${h}:${m}:00`);
                }}
                placeholder="Select Time"
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default AssessmentScheduleStep;
