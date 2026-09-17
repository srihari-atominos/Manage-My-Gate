import React from 'react';
import { View, ScrollView, Share, Platform, Linking } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { VisitorQRCode } from './VisitorQRCode';
import { VisitorPassCode } from './VisitorPassCode';
import { CheckCircle2, Share2, Home } from 'lucide-react-native';
import { PassTypeKey } from '../../mocks/visitorMocks';
import { encodeAppBarcode } from '@/src/utils/appBarcodeProtocol';

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

    const rawType = (passData.passType || 'GUEST').toUpperCase();
    const barcodePayload = encodeAppBarcode(rawType, passData.code, passData.id, passData.visitorName || 'Guest');
    const barcodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=12&data=${encodeURIComponent(barcodePayload)}`;

    const shareMessage =
      `🚪 *NAHOM VISITOR PASS* 🚪\n\n` +
      `🔑 *PASS CODE:* *${passData.code}*\n` +
      `👤 *Visitor:* ${passData.visitorName || 'Guest'}\n` +
      `🎫 *Pass Type:* ${rawType}\n` +
      `⏰ *Valid Until:* ${passData.validUntil ? new Date(passData.validUntil).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Today'}\n\n` +
      `📱 *Barcode / QR Pass Link:*\n${barcodeImageUrl}\n\n` +
      `*Security Instructions:*\n` +
      `Please present this 6-digit Pass Code (${passData.code}) or the Barcode image at the security gate for fast check-in.`;

    const cleanPhone = passData.phone ? passData.phone.replace(/[^0-9]/g, '') : '';
    const nativeWhatsappUrl = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(shareMessage)}`
      : `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;

    if (Platform.OS !== 'web') {
      try {
        await Linking.openURL(nativeWhatsappUrl);
        return;
      } catch (err) {
        // WhatsApp not installed: fallback to native share
      }

      try {
        await Share.share({
          title: `Nahom Visitor Pass (${passData.code})`,
          message: shareMessage,
        });
        return;
      } catch (shareErr) {
        console.log('Error opening native share sheet:', shareErr);
      }
    }

    try {
      await Share.share({
        title: `Nahom Visitor Pass (${passData.code})`,
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
          passId={passData.id}
          visitorName={passData.visitorName}
          type={passData.passType}
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
