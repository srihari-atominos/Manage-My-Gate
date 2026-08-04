import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DeliveryDetailsData } from './DeliveryDetailsStep';
import { DeliveryValidityData } from './DeliveryValidityStep';

export interface DeliveryPassReviewStepProps {
  partner: string;
  details: DeliveryDetailsData;
  validity: DeliveryValidityData;
}

export const DeliveryPassReviewStep: React.FC<DeliveryPassReviewStepProps> = ({
  partner,
  details,
  validity,
}) => {
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
        <DetailRow label="Delivery Partner" value={partner.toUpperCase()} iconName="Package" />
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
        <DetailRow
          label="Pass Validity Window"
          value={validity.validityDuration}
          iconName="Clock"
        />
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
