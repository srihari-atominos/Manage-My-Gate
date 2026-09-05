import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StaffDetailsData } from './StaffDetailsStep';
import { ServiceDateRangeData } from './ServiceDateRangeStep';
import { ServiceTimeWindowData } from './ServiceTimeWindowStep';

export interface ServicePassReviewStepProps {
  staff: StaffDetailsData;
  serviceCategory: string;
  dateRange: ServiceDateRangeData;
  weekdays: string[];
  timeWindow: ServiceTimeWindowData;
}

export const ServicePassReviewStep: React.FC<ServicePassReviewStepProps> = ({
  staff,
  serviceCategory,
  dateRange,
  weekdays,
  timeWindow,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Review Staff & Service Pass
        </Text>
        <Text variant="muted" className="text-xs">
          Confirm authorized entry schedules for daily staff member.
        </Text>
      </View>

      <DetailSection title="Staff Member Info" iconName="User">
        <DetailRow label="Staff Full Name" value={staff.staffName} iconName="User" />
        <DetailRow
          label="Contact Phone"
          value={staff.phone || 'Not Provided'}
          iconName="Phone"
        />
        <DetailRow
          label="Service Role"
          value={serviceCategory.toUpperCase()}
          iconName="Wrench"
        />
        <DetailRow
          label="Verification Type"
          value={
            staff.isIdProofPass ? (
              <StatusBadge label="ID-Proof Pass" variant="success" />
            ) : (
              <StatusBadge label="Standard Staff Pass" variant="info" />
            )
          }
          iconName="Shield"
        />
        {staff.isIdProofPass && (
          <DetailRow
            label="ID Proof Registered"
            value={`${staff.idProofType || 'Aadhaar Card'}: ${staff.idProofNumber || 'N/A'}`}
            iconName="ShieldAlert"
          />
        )}
        <DetailRow
          label="Work Note"
          value={staff.notes || 'Daily Household Staff'}
          iconName="Tag"
          isLast
        />
      </DetailSection>

      <DetailSection title="Schedule & Security Restrictions" iconName="Calendar">
        <DetailRow label="Pass Start Date" value={dateRange.startDate} iconName="Calendar" />
        <DetailRow label="Pass Expiration" value={dateRange.endDate} iconName="Calendar" />
        <DetailRow
          label="Authorized Weekdays"
          value={weekdays.join(', ')}
          iconName="CalendarCheck"
        />
        <DetailRow
          label="Daily Entry Slot"
          value={`${timeWindow?.startTime || '08:00'} - ${timeWindow?.endTime || '18:00'}`}
          iconName="Clock"
          isLast
        />
      </DetailSection>
    </ScrollView>
  );
};
