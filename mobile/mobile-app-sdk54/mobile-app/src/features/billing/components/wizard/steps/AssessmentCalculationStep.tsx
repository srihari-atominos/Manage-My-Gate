import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect, DropdownOption } from '@/components/forms/DropdownSelect';
import { Icon } from '@/components/ui/icon';
import { Calculator, Info } from 'lucide-react-native';

const METHOD_OPTIONS: DropdownOption[] = [
  { label: 'Fixed Flat Rate per Unit (₹)', value: 'FLAT_RATE' },
  { label: 'Rate per Sq. Ft. (₹ / sq.ft.)', value: 'PER_SQ_FT' },
  { label: 'Tiered Rate by BHK Floorplan', value: 'TIERED_BHK' },
];

const TIERED_FIELDS = [
  { key: 'studio', label: 'Studio' },
  { key: 'bhk1', label: '1 BHK' },
  { key: 'bhk2', label: '2 BHK' },
  { key: 'bhk3', label: '3 BHK' },
  { key: 'bhk4', label: '4 BHK' },
  { key: 'penthouse', label: 'Penthouse' },
  { key: 'duplex', label: 'Duplex' },
];

interface TieredRatesMap {
  studio: string;
  bhk1: string;
  bhk2: string;
  bhk3: string;
  bhk4: string;
  penthouse: string;
  duplex: string;
}

interface AssessmentCalculationStepProps {
  calcMethod: string;
  onChangeCalcMethod: (val: string) => void;
  flatAmount: string;
  onChangeFlatAmount: (val: string) => void;
  ratePerSqFt: string;
  onChangeRatePerSqFt: (val: string) => void;
  tieredRates: TieredRatesMap;
  onChangeTieredRate: (key: keyof TieredRatesMap, val: string) => void;
}

export const AssessmentCalculationStep: React.FC<AssessmentCalculationStepProps> = ({
  calcMethod,
  onChangeCalcMethod,
  flatAmount,
  onChangeFlatAmount,
  ratePerSqFt,
  onChangeRatePerSqFt,
  tieredRates,
  onChangeTieredRate,
}) => {
  return (
    <View className="gap-4">
      <View className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex-row items-center gap-2.5">
        <Icon as={Calculator} size={18} className="text-primary shrink-0" />
        <Text className="text-xs text-foreground font-medium flex-1">
          Select how fee amounts will be calculated for each villa or resident unit.
        </Text>
      </View>

      {/* Calculation Method Dropdown */}
      <DropdownSelect
        label="Calculation Method *"
        options={METHOD_OPTIONS}
        value={calcMethod}
        onValueChange={onChangeCalcMethod}
        placeholder="Select Calculation Formula"
      />

      {/* ── FLAT RATE ─────────────────────────────────────────────────── */}
      {calcMethod === 'FLAT_RATE' && (
        <View className="bg-card border border-border rounded-xl p-4 gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Fixed Flat Fee Configuration
          </Text>
          <TextInput
            label="Flat Maintenance Fee per Villa (₹) *"
            placeholder="e.g. 2500"
            keyboardType="decimal-pad"
            value={flatAmount}
            onChangeText={onChangeFlatAmount}
          />
          <Text className="text-[11px] text-muted-foreground mt-1">
            Every targeted villa or resident unit will be charged this exact amount.
          </Text>
        </View>
      )}

      {/* ── PER SQ FT ─────────────────────────────────────────────────── */}
      {calcMethod === 'PER_SQ_FT' && (
        <View className="bg-card border border-border rounded-xl p-4 gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Area Multiplier Configuration
          </Text>
          <TextInput
            label="Rate per Square Foot (₹ / sq.ft.) *"
            placeholder="e.g. 3.50"
            keyboardType="decimal-pad"
            value={ratePerSqFt}
            onChangeText={onChangeRatePerSqFt}
          />
          <Text className="text-[11px] text-muted-foreground mt-1">
            Calculated as Rate (₹/sqft) × Villa Unit Super Built-up Area (sq.ft).
          </Text>
        </View>
      )}

      {/* ── TIERED BHK MATRIX GRID ───────────────────────────────────── */}
      {calcMethod === 'TIERED_BHK' && (
        <View className="bg-card border border-border rounded-xl p-4 gap-3">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Floorplan Tiered BHK Rates (₹)
          </Text>
          <Text className="text-xs text-muted-foreground">
            Set custom flat fee amounts based on the unit layout type.
          </Text>

          <View className="flex-row flex-wrap gap-2.5 mt-1">
            {TIERED_FIELDS.map((item) => {
              const fieldKey = item.key as keyof TieredRatesMap;
              return (
                <View key={item.key} className="w-[48%] bg-muted/40 p-2.5 rounded-xl border border-border">
                  <Text className="text-xs font-extrabold text-foreground mb-1">{item.label}</Text>
                  <TextInput
                    placeholder="₹ 0"
                    keyboardType="number-pad"
                    value={tieredRates[fieldKey]}
                    onChangeText={(text) => onChangeTieredRate(fieldKey, text)}
                  />
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

export default AssessmentCalculationStep;
