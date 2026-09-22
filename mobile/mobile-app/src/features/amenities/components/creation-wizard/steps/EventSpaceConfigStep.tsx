import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Chip } from '@/components/common/Chip';
import { TextInput } from '@/components/forms/TextInput';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { Sparkles, Calendar, Clock, ShieldCheck } from 'lucide-react-native';
import {
  EVENT_NOTICE_PRESETS,
  ADVANCE_DAYS_PRESETS,
} from '../../../constants/amenityCatalogPresets';

export interface EventSpaceConfigData {
  maxCapacity: number | string;
  requiresApproval: boolean;
  advanceNoticeHours: number | string;
  advanceBookingDays: number | string;
}

export interface EventSpaceConfigStepProps {
  data: EventSpaceConfigData;
  onChange: (data: EventSpaceConfigData) => void;
  errors?: Partial<Record<keyof EventSpaceConfigData, string>>;
}

export const EventSpaceConfigStep: React.FC<EventSpaceConfigStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const currentNotice = String(data.advanceNoticeHours || '72');
  const currentAdvanceDays = parseInt(String(data.advanceBookingDays || 30), 10);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Event Space & Approval Policies
        </Text>
        <Text variant="muted" className="text-xs">
          Configure party hall occupancy, mandatory approval workflows, and lead times.
        </Text>
      </View>

      {/* Guest Hall Capacity */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Sparkles size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Maximum Event Headcount
            </Text>
            <Text variant="muted" className="text-xs">
              Total guests and attendees permitted inside the hall/lawn.
            </Text>
          </View>
        </View>

        <TextInput
          label="Hall / Space Max Capacity *"
          placeholder="e.g. 150"
          keyboardType="numeric"
          value={String(data.maxCapacity || '')}
          onChangeText={(val) => onChange({ ...data, maxCapacity: val })}
          error={errors.maxCapacity}
        />
      </View>

      {/* Mandatory Admin Approval Toggle */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-2">
        <ToggleSwitch
          label="Require Admin Review & Approval"
          description="Holds remain in 'PENDING_APPROVAL' until verified by estate management"
          value={data.requiresApproval ?? true}
          onValueChange={(val) => onChange({ ...data, requiresApproval: val })}
        />
      </View>

      {/* Advance Notice Required */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Clock size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Minimum Advance Notice
            </Text>
            <Text variant="muted" className="text-xs">
              Required lead time prior to event date for staff preparation.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {EVENT_NOTICE_PRESETS.map((p) => {
            const isSelected = currentNotice === p.id;
            return (
              <Chip
                key={p.id}
                label={p.label}
                selected={isSelected}
                onPress={() => onChange({ ...data, advanceNoticeHours: p.id })}
              />
            );
          })}
        </View>
      </View>

      {/* Advance Booking Window */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
            <Calendar size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground">
              Advance Booking Horizon
            </Text>
            <Text variant="muted" className="text-xs">
              How far in advance residents can book party dates.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {ADVANCE_DAYS_PRESETS.map((days) => (
            <Chip
              key={days}
              label={`${days} Days Ahead`}
              selected={currentAdvanceDays === days}
              onPress={() => onChange({ ...data, advanceBookingDays: days })}
            />
          ))}
          <Chip
            label="60 Days"
            selected={currentAdvanceDays === 60}
            onPress={() => onChange({ ...data, advanceBookingDays: 60 })}
          />
        </View>
      </View>

      {/* Approval & Deposit Note */}
      <View className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex-row gap-3 items-start">
        <ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" />
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold text-primary">
            Session Booking Workflow
          </Text>
          <Text className="text-xs text-muted-foreground leading-4">
            Event space bookings trigger a tentative hold ticket for community admin review. Gate access passes are only released once the security deposit is confirmed.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default EventSpaceConfigStep;
