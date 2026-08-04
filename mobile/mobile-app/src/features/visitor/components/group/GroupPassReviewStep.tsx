import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { GroupVisitDetailsData } from './GroupVisitDetailsStep';
import { GroupGuestItem } from './AddGroupGuestsStep';

export interface GroupPassReviewStepProps {
  details: GroupVisitDetailsData;
  guests: GroupGuestItem[];
}

export const GroupPassReviewStep: React.FC<GroupPassReviewStepProps> = ({
  details,
  guests,
}) => {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Review Group Visit Pass
        </Text>
        <Text variant="muted" className="text-xs">
          Verify group event details and attendee list.
        </Text>
      </View>

      <DetailSection title="Group Event Overview" iconName="PartyPopper">
        <DetailRow label="Event Title" value={details.eventTitle} iconName="PartyPopper" />
        <DetailRow label="Event Purpose" value={details.purpose} iconName="Tag" />
        <DetailRow label="Visit Date" value={details.visitDate} iconName="Calendar" />
        <DetailRow
          label="Expected Arrival Window"
          value={details.expectedTime || 'Full Day'}
          iconName="Clock"
        />
        <DetailRow
          label="Total Approved Guests"
          value={`${guests.length} Visitors`}
          iconName="Users"
          isLast
        />
      </DetailSection>

      <DetailSection title="Guest List Breakdown" iconName="Users">
        {guests.map((g, idx) => (
          <DetailRow
            key={g.id}
            label={`${idx + 1}. ${g.name}`}
            value={g.phone || 'Guest'}
            iconName="User"
            isLast={idx === guests.length - 1}
          />
        ))}
      </DetailSection>
    </ScrollView>
  );
};
