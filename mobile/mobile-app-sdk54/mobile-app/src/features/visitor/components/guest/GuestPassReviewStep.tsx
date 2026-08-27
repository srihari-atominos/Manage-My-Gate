import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GuestDetailsData } from './GuestDetailsStep';
import { GuestScheduleData } from './GuestScheduleStep';
import { GuestPassOptionsData } from './GuestPassOptionsStep';

export interface GuestPassReviewStepProps {
  details: GuestDetailsData;
  schedule: GuestScheduleData;
  options: GuestPassOptionsData;
}

export const GuestPassReviewStep: React.FC<GuestPassReviewStepProps> = ({
  details,
  schedule,
  options,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Review Guest Pass Details
        </Text>
        <Text variant="muted" className="text-xs">
          Please confirm all entered details before generating entry pass.
        </Text>
      </View>

      <DetailSection title="Guest Summary" iconName="User">
        <DetailRow label="Visitor Full Name" value={details.visitorName} iconName="User" />
        <DetailRow
          label="Phone Number"
          value={details.phone || 'Not Provided'}
          iconName="Phone"
        />
        <DetailRow
          label="Purpose of Visit"
          value={details.purpose || 'Personal Visit'}
          iconName="Tag"
          isLast
        />
      </DetailSection>

      <DetailSection title="Visit Schedule" iconName="Calendar">
        <DetailRow label="Expected Date" value={schedule.visitDate} iconName="Calendar" />
        <DetailRow
          label="Time Slot"
          value={
            schedule.timeSlot === 'CUSTOM'
              ? `${schedule.customStartTime || '02:00 PM'} - ${schedule.customEndTime || '06:00 PM'}`
              : schedule.timeSlot
          }
          iconName="Clock"
          isLast
        />
      </DetailSection>

      <DetailSection title="Pass Configuration" iconName="Shield">
        <DetailRow
          label="Entry Mode"
          value={<StatusBadge label={options.entryMode} variant="info" />}
          iconName="ShieldCheck"
        />
        <DetailRow
          label="Verification Type"
          value={
            options.isIdProofPass ? (
              <StatusBadge label="ID-Proof Pass" variant="success" />
            ) : (
              <StatusBadge label="Standard QR Code Pass" variant="neutral" />
            )
          }
          iconName="Shield"
        />
        {options.isIdProofPass && (
          <DetailRow
            label="ID Proof Registered"
            value={`${options.idProofType || 'Aadhaar Card'}: ${options.idProofNumber || 'N/A'}`}
            iconName="ShieldAlert"
          />
        )}
        <DetailRow
          label="Vehicle Number"
          value={options.vehicleNo || 'None / On Foot'}
          iconName="Car"
        />
        <DetailRow
          label="Gate Instructions"
          value={options.gateInstructions || 'Standard Verification'}
          iconName="ShieldAlert"
          isLast
        />
      </DetailSection>
    </ScrollView>
  );
};
