import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { Chip } from '@/components/common/Chip';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { Wrench, Plus, Minus, ShieldCheck, Clock } from 'lucide-react-native';
import { LOAN_DURATION_PRESETS } from '../../../constants/amenityCatalogPresets';

export interface InventoryToolsConfigData {
  availableStock: number | string;
  maxLoanHours: number | string;
  requiresInspection: boolean;
}

export interface InventoryToolsConfigStepProps {
  data: InventoryToolsConfigData;
  onChange: (data: InventoryToolsConfigData) => void;
  errors?: Partial<Record<keyof InventoryToolsConfigData, string>>;
}

export const InventoryToolsConfigStep: React.FC<InventoryToolsConfigStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const currentStock = Math.max(1, parseInt(String(data.availableStock || 1), 10));
  const currentLoanHours = String(data.maxLoanHours || '24');

  const incrementStock = () => onChange({ ...data, availableStock: currentStock + 1 });
  const decrementStock = () => onChange({ ...data, availableStock: Math.max(1, currentStock - 1) });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Inventory Stock & Loan Periods
        </Text>
        <Text variant="muted" className="text-xs">
          Manage physical asset inventory, checkout limits, and return inspection rules.
        </Text>
      </View>

      {/* Stock Quantity Counter */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3.5">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Wrench size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Total Physical Stock Units
            </Text>
            <Text variant="muted" className="text-xs">
              Number of tool units or equipment kits in inventory.
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
          <Text className="text-sm font-semibold text-foreground">Available Quantity</Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={decrementStock}
              className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center active:bg-muted"
            >
              <Minus size={16} className="text-foreground" />
            </TouchableOpacity>

            <Text className="text-lg font-bold text-foreground w-8 text-center">
              {currentStock}
            </Text>

            <TouchableOpacity
              onPress={incrementStock}
              className="w-9 h-9 rounded-xl bg-primary items-center justify-center active:bg-primary/90"
            >
              <Plus size={16} className="text-primary-foreground" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Max Loan Duration Chips */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Clock size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Maximum Checkout Duration
            </Text>
            <Text variant="muted" className="text-xs">
              Allowed loan time before resident must return the equipment.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {LOAN_DURATION_PRESETS.map((p) => {
            const isSelected = currentLoanHours === p.id;
            return (
              <Chip
                key={p.id}
                label={p.label}
                selected={isSelected}
                onPress={() => onChange({ ...data, maxLoanHours: p.id })}
              />
            );
          })}
        </View>
      </View>

      {/* Return Inspection Requirement */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-2">
        <ToggleSwitch
          label="Mandatory Return Inspection"
          description="Security guard or staff must sign off on tool condition before closing booking"
          value={data.requiresInspection ?? true}
          onValueChange={(val) => onChange({ ...data, requiresInspection: val })}
        />
      </View>

      {/* Inventory Decrement Behavior Note */}
      <View className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex-row gap-3 items-start">
        <ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" />
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold text-primary">
            Asset Inventory Counter
          </Text>
          <Text className="text-xs text-muted-foreground leading-4">
            The booking engine decrements the available stock counter during active loans. Once stock reaches 0, new reservation holds are temporarily locked.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default InventoryToolsConfigStep;
