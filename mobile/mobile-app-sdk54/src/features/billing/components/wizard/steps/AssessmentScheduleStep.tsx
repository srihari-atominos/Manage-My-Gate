import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect, DropdownOption } from '@/components/forms/DropdownSelect';
import { DayOfMonthPicker } from '@/components/forms/DayOfMonthPicker';
import { DatePicker } from '@/components/common/DatePicker';
import { TimePicker } from '@/components/common/TimePicker';
import { Chip } from '@/components/common/Chip';
import { Icon } from '@/components/ui/icon';
import { Calendar, Clock, Layers, AlertCircle, CheckCircle2 } from 'lucide-react-native';

const CYCLE_OPTIONS: DropdownOption[] = [
  { label: 'Monthly Billing', value: 'MONTHLY' },
  { label: 'Weekly Billing', value: 'WEEKLY' },
  { label: 'Quarterly Billing', value: 'QUARTERLY' },
  { label: 'Annual Billing', value: 'ANNUALLY' },
  { label: 'Ad-Hoc (One-Time)', value: 'AD_HOC' },
];

const DAYS_OF_WEEK = [
  { label: 'Sun', fullLabel: 'Sunday', value: 0 },
  { label: 'Mon', fullLabel: 'Monday', value: 1 },
  { label: 'Tue', fullLabel: 'Tuesday', value: 2 },
  { label: 'Wed', fullLabel: 'Wednesday', value: 3 },
  { label: 'Thu', fullLabel: 'Thursday', value: 4 },
  { label: 'Fri', fullLabel: 'Friday', value: 5 },
  { label: 'Sat', fullLabel: 'Saturday', value: 6 },
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
  const isWeekly = isRecurring && billingCycle === 'WEEKLY';

  const selectedDayLabels = selectedDays
    .map((d) => DAYS_OF_WEEK.find((w) => w.value === d)?.fullLabel)
    .filter(Boolean)
    .join(', ');

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

          {/* ── WEEKLY DAY-OF-THE-WEEK SELECTOR ───────────────────────── */}
          {isWeekly ? (
            <View className="bg-card border border-border rounded-xl p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Weekly Generation Day *
                </Text>
                <Text className="text-xs font-bold text-primary">
                  {selectedDays.length} Selected
                </Text>
              </View>

              <Text className="text-xs text-muted-foreground">
                Choose the day of the week when recurring invoices should generate automatically.
              </Text>

              <View className="flex-row flex-wrap gap-2 mt-1">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <TouchableOpacity
                      key={d.value}
                      onPress={() => onToggleDay(d.value)}
                      activeOpacity={0.7}
                      className={`flex-1 min-w-[42px] py-2.5 rounded-xl border items-center justify-center ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background'
                      }`}
                    >
                      <Text
                        className={`text-xs font-extrabold ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedDays.length > 0 ? (
                <View className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex-row items-center gap-2 mt-1">
                  <Icon as={CheckCircle2} size={16} className="text-primary shrink-0" />
                  <Text className="text-xs text-primary font-bold flex-1">
                    Invoices will automatically generate every {selectedDayLabels} at 00:00 UTC.
                  </Text>
                </View>
              ) : (
                <Text className="text-xs font-bold text-destructive mt-1">
                  ⚠️ Please select at least one day of the week.
                </Text>
              )}
            </View>
          ) : (
            /* ── MONTHLY / QUARTERLY / ANNUAL GENERATION DAY PICKER ─────── */
            <View className="bg-card border border-border rounded-xl p-4 gap-3">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {billingCycle === 'QUARTERLY' ? 'Quarterly' : billingCycle === 'ANNUALLY' ? 'Annual' : 'Monthly'} Generation Day
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
                <Text className="text-xs font-bold text-foreground">First Day of Cycle (1st)</Text>
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
                <Text className="text-xs font-bold text-foreground">Last Day of Month / Cycle</Text>
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
          )}
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
                ⚡ Immediate Run
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
                📅 Specific Schedule
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">Pick future date/time</Text>
            </TouchableOpacity>
          </View>

          {triggerMode === 'SCHEDULED' && (
            <View className="gap-3 mt-2">
              <DatePicker
                label="Scheduled Generation Date *"
                value={scheduledDate ? new Date(scheduledDate) : null}
                onChange={(date: Date) => {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const d = String(date.getDate()).padStart(2, '0');
                  onChangeScheduledDate(`${y}-${m}-${d}`);
                }}
              />
              <TimePicker
                label="Scheduled Execution Time"
                value={
                  scheduledTime
                    ? (() => {
                        const parts = scheduledTime.split(':');
                        const d = new Date();
                        d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
                        return d;
                      })()
                    : null
                }
                onChange={(date: Date) => {
                  const h = String(date.getHours()).padStart(2, '0');
                  const m = String(date.getMinutes()).padStart(2, '0');
                  onChangeScheduledTime(`${h}:${m}`);
                }}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default AssessmentScheduleStep;
