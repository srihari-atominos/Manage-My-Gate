import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CabVehicleData } from './CabVehicleStep';
import { CabScheduleData } from './CabScheduleStep';
import { MOCK_WEEKDAYS } from '../../mocks/visitorMocks';

export interface CabPassReviewStepProps {
  provider: string;
  vehicle: CabVehicleData;
  schedule: CabScheduleData;
}

export const CabPassReviewStep: React.FC<CabPassReviewStepProps> = ({
  provider,
  vehicle,
  schedule,
}) => {
  const isMultiUse = schedule.usageType === 'MULTI_USE';

  const weekdayLabels = (schedule.selectedWeekdays || [])
    .map((id) => MOCK_WEEKDAYS.find((w) => w.id === id)?.label || id)
    .join(', ');

  const timeSlotLabels = Array.isArray(schedule.timeSlots) && schedule.timeSlots.length > 0
    ? schedule.timeSlots.map((ts) => `${ts.startTime} - ${ts.endTime}`).join(', ')
    : 'Full Day (07:00 AM - 09:00 PM)';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Review Cab Pre-Approval
        </Text>
        <Text variant="muted" className="text-xs">
          Confirm vehicle plate number and provider service.
        </Text>
      </View>

      <DetailSection title="Cab Details" iconName="Car">
        <DetailRow label="Service Provider" value={provider.toUpperCase()} iconName="Car" />
        <DetailRow label="Vehicle Type" value={vehicle.vehicleType} iconName="Car" />
        <DetailRow
          label="License Plate Number"
          value={vehicle.vehicleNo}
          iconName="ShieldCheck"
          copyable
        />
        <DetailRow
          label="Driver Contact Phone"
          value={vehicle.driverPhone || 'Not Provided'}
          iconName="Phone"
        />
        <DetailRow
          label="Pass Type"
          value={<StatusBadge label={isMultiUse ? 'Multi-Use Pass' : 'One-Time Ride'} variant={isMultiUse ? 'success' : 'info'} />}
          iconName="ShieldCheck"
        />
        {isMultiUse ? (
          <>
            <DetailRow
              label="Authorized Weekdays"
              value={weekdayLabels || 'Mon - Fri'}
              iconName="Calendar"
            />
            <DetailRow
              label="Time Windows"
              value={timeSlotLabels}
              iconName="Clock"
              isLast
            />
          </>
        ) : (
          <DetailRow
            label="Expected Window"
            value={<StatusBadge label={schedule.arrivalWindow} variant="info" />}
            iconName="Clock"
            isLast
          />
        )}
      </DetailSection>
    </ScrollView>
  );
};

