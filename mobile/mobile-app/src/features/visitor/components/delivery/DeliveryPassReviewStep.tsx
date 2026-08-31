import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DeliveryDetailsData } from './DeliveryDetailsStep';
import { DeliveryValidityData } from './DeliveryValidityStep';
import { MOCK_WEEKDAYS } from '../../mocks/visitorMocks';

export interface DeliveryPassReviewStepProps {
  partner: string;
  details: DeliveryDetailsData;
  validity: DeliveryValidityData;
  customPartnerName?: string;
}

export const DeliveryPassReviewStep: React.FC<DeliveryPassReviewStepProps> = ({
  partner,
  details,
  validity,
  customPartnerName,
}) => {
  const isMultiUse = validity.usageType === 'MULTI_USE';

  const displayPartner =
    partner === 'other' && customPartnerName && customPartnerName.trim()
      ? customPartnerName.trim()
      : partner;

  const weekdayLabels = (validity.selectedWeekdays || [])
    .map((id) => MOCK_WEEKDAYS.find((w) => w.id === id)?.label || id)
    .join(', ');

  const timeSlotLabels = Array.isArray(validity.timeSlots) && validity.timeSlots.length > 0
    ? validity.timeSlots.map((ts) => `${ts.startTime} - ${ts.endTime}`).join(', ')
    : 'Full Day (06:00 AM - 09:00 PM)';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Review Delivery Pass
        </Text>
        <Text variant="muted" className="text-xs">
          Confirm delivery agent pre-approval details.
        </Text>
      </View>

      <DetailSection title="Delivery Summary" iconName="Package">
        <DetailRow label="Delivery Partner" value={displayPartner.toUpperCase()} iconName="Package" />
        <DetailRow
          label="Pass Type"
          value={<StatusBadge label={isMultiUse ? 'Multi-Use Pass' : 'One-Time Delivery'} variant={isMultiUse ? 'success' : 'info'} />}
          iconName="ShieldCheck"
        />
        <DetailRow
          label="Location Preference"
          value={<StatusBadge label={details.deliveryAction} variant="info" />}
          iconName="DoorOpen"
        />
        <DetailRow
          label="Order / Tracking ID"
          value={details.orderId || 'Not Specified'}
          iconName="Hash"
        />
        <DetailRow
          label="Package Count"
          value={details.packageCount || '1 Package'}
          iconName="Package"
        />

        {isMultiUse ? (
          <>
            <DetailRow
              label="Authorized Weekdays"
              value={weekdayLabels || 'Everyday'}
              iconName="Calendar"
            />
            <DetailRow
              label="Time Windows"
              value={timeSlotLabels}
              iconName="Clock"
            />
          </>
        ) : (
          <DetailRow
            label="Pass Validity Window"
            value={
              validity.validityDuration === 'CUSTOM' ? (
                <StatusBadge
                  label={`Custom (${validity.customStartTime || '02:00 PM'} - ${validity.customEndTime || '06:00 PM'})`}
                  variant="info"
                />
              ) : (
                <StatusBadge
                  label={
                    validity.validityDuration === 'THIRTY_MINS'
                      ? '30 Minutes Quick Pass'
                      : validity.validityDuration === 'ONE_HOUR'
                      ? '1 Hour Pass'
                      : validity.validityDuration === 'TWO_HOURS'
                      ? '2 Hours Pass'
                      : 'Valid Until Midnight Today'
                  }
                  variant="info"
                />
              )
            }
            iconName="Clock"
          />
        )}

        <DetailRow
          label="Security Instructions"
          value={details.instructions || 'Standard Gate Desk Check'}
          iconName="ShieldCheck"
          isLast
        />
      </DetailSection>
    </ScrollView>
  );
};
