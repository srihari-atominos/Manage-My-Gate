import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { Chip } from '@/components/common/Chip';
import { Users, Info, ShieldCheck } from 'lucide-react-native';
import { QUOTA_PRESETS } from '../../../constants/amenityCatalogPresets';

export interface SharedCapacityConfigData {
  maxCapacity: number | string;
  maxHeadcountPerReservation: number | string;
}

export interface SharedCapacityConfigStepProps {
  data: SharedCapacityConfigData;
  onChange: (data: SharedCapacityConfigData) => void;
  errors?: Partial<Record<keyof SharedCapacityConfigData, string>>;
}

export const SharedCapacityConfigStep: React.FC<SharedCapacityConfigStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const currentQuota = parseInt(String(data.maxHeadcountPerReservation || 2), 10);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Headcount Capacity & Resident Quotas
        </Text>
        <Text variant="muted" className="text-xs">
          Configure maximum simultaneous occupancy and per-resident guest limits.
        </Text>
      </View>

      <View className="bg-card p-4 rounded-3xl border border-border gap-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Users size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Concurrent Facility Capacity
            </Text>
            <Text variant="muted" className="text-xs">
              Total swimmers, gym-goers, or visitors permitted at one time.
            </Text>
          </View>
        </View>

        <TextInput
          label="Total Facility Capacity *"
          placeholder="e.g. 50"
          keyboardType="numeric"
          value={String(data.maxCapacity || '')}
          onChangeText={(val) => onChange({ ...data, maxCapacity: val })}
          error={errors.maxCapacity}
          helperText="The booking engine dynamically tracks headcount tickets against this total limit."
        />
      </View>

      <View className="bg-card p-4 rounded-3xl border border-border gap-3.5">
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Guest Quota Per Booking
        </Text>

        <Text variant="muted" className="text-xs">
          Select or customize the maximum number of guests a resident can bring in a single reservation.
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {QUOTA_PRESETS.map((q) => {
            const isSelected = currentQuota === q;
            return (
              <Chip
                key={q}
                label={`${q} Guest${q > 1 ? 's' : ''}`}
                selected={isSelected}
                onPress={() => onChange({ ...data, maxHeadcountPerReservation: q })}
              />
            );
          })}
        </View>

        <TextInput
          label="Custom Headcount Quota"
          placeholder="2"
          keyboardType="numeric"
          value={String(data.maxHeadcountPerReservation || '')}
          onChangeText={(val) => onChange({ ...data, maxHeadcountPerReservation: val })}
          error={errors.maxHeadcountPerReservation}
        />
      </View>

      {/* Shared Engine Behavior Note */}
      <View className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex-row gap-3 items-start">
        <ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" />
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold text-primary">
            Headcount Bucket Allocation
          </Text>
          <Text className="text-xs text-muted-foreground leading-4">
            Multiple residents can enter and book concurrent passes until the max capacity ({data.maxCapacity || 50}) is filled. No court mutex locks are enforced.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SharedCapacityConfigStep;
