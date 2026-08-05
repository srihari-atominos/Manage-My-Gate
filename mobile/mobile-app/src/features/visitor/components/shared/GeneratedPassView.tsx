import React from 'react';
import { View, ScrollView, Share, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { VisitorQRCode } from './VisitorQRCode';
import { VisitorPassCode } from './VisitorPassCode';
import { CheckCircle2, Share2, Home } from 'lucide-react-native';
import { PassTypeKey } from '../../mocks/visitorMocks';

export interface GeneratedPassData {
  id: string;
  passType: PassTypeKey;
  visitorName: string;
  phone?: string;
  code: string;
  validFrom: string;
  validUntil: string;
  purpose?: string;
  provider?: string;
  vehicleNo?: string;
  guestCount?: number;
  guestList?: Array<{ name: string; phone?: string }>;
  allowedWeekdays?: string[];
  timeWindow?: { startTime: string; endTime: string };
  deliveryInstructions?: string;
}

export interface GeneratedPassViewProps {
  passData: GeneratedPassData;
  onDone: () => void;
  onShare?: () => void;
}

const PASS_TYPE_NAMES: Record<PassTypeKey, string> = {
  GUEST: 'Guest Pass',
  GROUP: 'Group Visit Pass',
  CAB: 'Cab / Taxi Pre-Approval',
  DELIVERY: 'Delivery Entry Pass',
  SERVICE: 'Staff / Service Pass',
};

export const GeneratedPassView: React.FC<GeneratedPassViewProps> = ({
  passData,
  onDone,
  onShare,
}) => {
  const handleSharePass = async () => {
    if (onShare) {
      onShare();
      return;
    }

    const shareMessage =
      `*Manage-My-Gate Visitor Pass*\n\n` +
      `Visitor Name: ${passData.visitorName}\n` +
      `Pass Type: ${PASS_TYPE_NAMES[passData.passType]}\n` +
      `Pass Code: ${passData.code}\n` +
      `Valid Until: ${new Date(passData.validUntil).toLocaleString()}\n\n` +
      `Please show this code or QR at the security gate for entry.`;

    try {
      await Share.share({
        title: 'Visitor Pass Code',
        message: shareMessage,
      });
    } catch (err) {
      console.log('Error sharing pass', err);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4 pb-12">
      {/* Success Badge Banner */}
      <View className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl items-center gap-2">
        <View className="w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center">
          <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
        </View>
        <Text variant="h3" className="font-bold text-foreground text-center">
          Pass Generated Successfully!
        </Text>
        <Text variant="muted" className="text-xs text-center">
          Share this pass or QR code with your visitor for seamless gate entry.
        </Text>
      </View>

      {/* Main Pass Digital Ticket */}
      <View className="bg-card border border-border rounded-2xl p-4 gap-4 shadow-sm">
        {/* Pass Header */}
        <View className="flex-row items-center justify-between border-b border-border pb-3">
          <View className="gap-0.5">
            <Text variant="small" className="text-muted-foreground uppercase font-bold text-[10px]">
              {PASS_TYPE_NAMES[passData.passType]}
            </Text>
            <Text variant="h3" className="font-extrabold text-foreground">
              {passData.visitorName}
            </Text>
          </View>
          <StatusBadge label="ACTIVE" variant="success" dot />
        </View>

        {/* QR Code Presentation */}
        <VisitorQRCode
          code={passData.code}
          validityText={`Valid until ${new Date(passData.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        />

        {/* 6-Digit Pass Code */}
        <VisitorPassCode code={passData.code} />

        {/* Pass Details breakdown */}
        <DetailSection title="Pass Details" iconName="FileText">
          <DetailRow label="Visitor Name" value={passData.visitorName} iconName="User" />
          {passData.phone ? (
            <DetailRow label="Phone Number" value={passData.phone} iconName="Phone" copyable />
          ) : null}
          {passData.provider ? (
            <DetailRow label="Provider / Service" value={passData.provider} iconName="Briefcase" />
          ) : null}
          {passData.vehicleNo ? (
            <DetailRow label="Vehicle Number" value={passData.vehicleNo} iconName="Car" copyable />
          ) : null}
          {passData.guestCount ? (
            <DetailRow
              label={passData.passType === 'GROUP' ? 'Total Passes Issued' : 'Total Guests'}
              value={`${passData.guestCount} ${passData.passType === 'GROUP' ? 'Passes' : 'Visitors'}`}
              iconName={passData.passType === 'GROUP' ? 'Ticket' : 'Users'}
            />
          ) : null}
          {passData.purpose ? (
            <DetailRow label="Purpose / Note" value={passData.purpose} iconName="Tag" />
          ) : null}
          {passData.allowedWeekdays ? (
            <DetailRow label="Allowed Days" value={passData.allowedWeekdays.join(', ')} iconName="Calendar" />
          ) : null}
          {passData.timeWindow ? (
            <DetailRow
              label="Daily Time Slot"
              value={`${passData.timeWindow.startTime} - ${passData.timeWindow.endTime}`}
              iconName="Clock"
            />
          ) : null}
          <DetailRow
            label="Valid From"
            value={new Date(passData.validFrom).toLocaleDateString()}
            iconName="Calendar"
          />
          <DetailRow
            label="Valid Until"
            value={new Date(passData.validUntil).toLocaleDateString()}
            iconName="Calendar"
            isLast
          />
        </DetailSection>

        {passData.guestList && passData.guestList.length > 0 ? (
          <DetailSection title="Approved Attendees" iconName="Users">
            {passData.guestList.map((g, idx) => (
              <DetailRow
                key={idx}
                label={`${idx + 1}. ${g.name}`}
                value={g.phone || 'Guest'}
                iconName="User"
                isLast={idx === passData.guestList!.length - 1}
              />
            ))}
          </DetailSection>
        ) : null}
      </View>

      {/* Primary Action Controls */}
      <View className="gap-3 pt-2">
        <Button
          variant="default"
          onPress={handleSharePass}
          className="h-12 rounded-xl bg-primary flex-row items-center justify-center gap-2"
        >
          <Share2 size={18} color="#fff" />
          <Text className="font-bold text-primary-foreground text-base">
            Share Pass Invitation
          </Text>
        </Button>

        <Button
          variant="outline"
          onPress={onDone}
          className="h-12 rounded-xl flex-row items-center justify-center gap-2"
        >
          <Home size={18} className="text-foreground" />
          <Text className="font-semibold text-foreground">
            Back to Visitors Dashboard
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
};
