import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { Chip } from '@/components/common/Chip';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { Check, ShieldAlert, CircleDollarSign } from 'lucide-react-native';
import { AmenityArchetype, AmenityPricingType } from '../../../types/amenityDomain.types';
import { PRICING_CHIP_OPTIONS } from '../../../constants/amenityCatalogPresets';

export interface PricingAndPolicyData {
  pricingType: AmenityPricingType;
  baseRate: number | string;
  securityDeposit: number | string;
  isCancellationAllowed: boolean;
  refundCutoffHours: number | string;
  refundPercentage: number | string;
}

export interface PricingAndPolicyStepProps {
  archetype: AmenityArchetype;
  data: PricingAndPolicyData;
  onChange: (data: PricingAndPolicyData) => void;
  errors?: Partial<Record<keyof PricingAndPolicyData, string>>;
}

export const PricingAndPolicyStep: React.FC<PricingAndPolicyStepProps> = ({
  archetype,
  data,
  onChange,
  errors = {},
}) => {
  const currentPricingType = data.pricingType || 'FREE';

  const applyRefundPreset = (cutoff: number, pct: number) => {
    onChange({
      ...data,
      refundCutoffHours: cutoff,
      refundPercentage: pct,
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Pricing Model & Cancellation Policy
        </Text>
        <Text variant="muted" className="text-xs">
          Set resident access fees, security deposits, and cancellation refund tiers.
        </Text>
      </View>

      {/* Pricing Model Chips */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <CircleDollarSign size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Billing Model
            </Text>
            <Text variant="muted" className="text-xs">
              Choose how residents are charged for this facility.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {PRICING_CHIP_OPTIONS.map((p) => {
            const isSelected = currentPricingType === p.value;
            return (
              <Chip
                key={p.value}
                label={p.label}
                selected={isSelected}
                onPress={() => {
                  if (p.value === 'FREE') {
                    onChange({ ...data, pricingType: p.value, baseRate: 0, securityDeposit: 0 });
                  } else {
                    onChange({
                      ...data,
                      pricingType: p.value,
                      baseRate: Number(data.baseRate) > 0 ? data.baseRate : '',
                    });
                  }
                }}
              />
            );
          })}
        </View>

        {currentPricingType === 'FREE' ? (
          <View className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 flex-row items-center gap-2 mt-1">
            <Check size={16} className="text-emerald-600" />
            <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex-1">
              Free Access — Residents can book without payment transactions.
            </Text>
          </View>
        ) : (
          <View className="gap-3 mt-1">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  label={`Rate (₹/${
                    currentPricingType === 'DAILY'
                      ? 'day'
                      : currentPricingType === 'FIXED_EVENT'
                      ? 'event'
                      : 'slot'
                  }) *`}
                  placeholder="250"
                  keyboardType="numeric"
                  required
                  value={
                    data.baseRate === undefined ||
                    data.baseRate === null ||
                    (data.baseRate === 0 && (currentPricingType as any) !== 'FREE')
                      ? ''
                      : String(data.baseRate)
                  }
                  onChangeText={(val) => onChange({ ...data, baseRate: val })}
                  error={errors.baseRate}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  label="Security Deposit (₹)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={
                    data.securityDeposit === undefined || data.securityDeposit === null
                      ? ''
                      : String(data.securityDeposit)
                  }
                  onChangeText={(val) => onChange({ ...data, securityDeposit: val })}
                  error={errors.securityDeposit}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Cancellation & Refund Policies */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3.5">
        <ToggleSwitch
          label="Allow Resident Cancellation"
          description="Enables residents to cancel active bookings within the cutoff window"
          value={data.isCancellationAllowed ?? true}
          onValueChange={(val) => onChange({ ...data, isCancellationAllowed: val })}
        />

        {data.isCancellationAllowed && (
          <View className="gap-3 pt-2 border-t border-border/60">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Refund Tier Presets
            </Text>

            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="Flexible (100% refund up to 2h)"
                selected={
                  Number(data.refundCutoffHours) === 2 &&
                  Number(data.refundPercentage) === 100
                }
                onPress={() => applyRefundPreset(2, 100)}
              />
              <Chip
                label="Moderate (50% refund up to 24h)"
                selected={
                  Number(data.refundCutoffHours) === 24 &&
                  Number(data.refundPercentage) === 50
                }
                onPress={() => applyRefundPreset(24, 50)}
              />
              <Chip
                label="Strict (No Refund / 0%)"
                selected={Number(data.refundPercentage) === 0}
                onPress={() => applyRefundPreset(0, 0)}
              />
            </View>

            <View className="flex-row gap-3 mt-1">
              <View className="flex-1">
                <TextInput
                  label="Cutoff Window (Hours)"
                  placeholder="24"
                  keyboardType="numeric"
                  value={String(data.refundCutoffHours ?? '24')}
                  onChangeText={(val) => onChange({ ...data, refundCutoffHours: val })}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  label="Refund Percentage (%)"
                  placeholder="100"
                  keyboardType="numeric"
                  value={String(data.refundPercentage ?? '100')}
                  onChangeText={(val) => onChange({ ...data, refundPercentage: val })}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default PricingAndPolicyStep;
