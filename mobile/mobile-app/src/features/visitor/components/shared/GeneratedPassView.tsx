import React, { useState } from 'react';
import { View, ScrollView, Share, Platform, Linking, Clipboard, Alert, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { VisitorQRCode } from './VisitorQRCode';
import { VisitorPassCode } from './VisitorPassCode';
import { CheckCircle2, Share2, Home, MessageCircle, Copy, Check } from 'lucide-react-native';
import { PassTypeKey } from '../../mocks/visitorMocks';
import { encodeAppBarcode, buildVisitorPassShareMessage } from '@/src/utils/appBarcodeProtocol';
import { shareQrImage } from '@/src/utils/qrPngGenerator';

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

const PASS_TYPE_NAMES: Record<string, string> = {
  GUEST: 'Guest Pass',
  ADMIN_GUEST: 'Guest Pass',
  COMMUNITY_GUEST: 'Guest Pass',
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
  const [copied, setCopied] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);

  const rawType = (passData.passType || 'GUEST').toUpperCase();
  const barcodePayload = encodeAppBarcode(rawType, passData.code, passData.id, passData.visitorName || 'Guest');

  const handleShareBarcodeImage = async () => {
    if (sharingImage) return;
    setSharingImage(true);
    try {
      const shared = await shareQrImage(
        barcodePayload,
        passData.code,
        `Nahom Visitor Pass - ${passData.code}`
      );
      if (!shared) {
        // Fallback to WhatsApp text message with embedded visual QR code
        await handleSharePassMessage();
      }
    } finally {
      setSharingImage(false);
    }
  };

  const handleSharePassMessage = async () => {
    if (onShare) {
      onShare();
      return;
    }

    const shareMessage = buildVisitorPassShareMessage({
      passCode: passData.code,
      visitorName: passData.visitorName || 'Guest',
      passTypeLabel: PASS_TYPE_NAMES[passData.passType] || rawType,
      validUntil: passData.validUntil,
      barcodePayload,
    });

    const cleanPhone = passData.phone ? passData.phone.replace(/[^0-9]/g, '') : '';
    const nativeWhatsappUrl = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(shareMessage)}`
      : `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;

    if (Platform.OS !== 'web') {
      try {
        await Linking.openURL(nativeWhatsappUrl);
        return;
      } catch (err) {
        // WhatsApp not installed: fallback to native share sheet
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

  const handleCopyCode = () => {
    setCopied(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(passData.code);
    } else if (Clipboard && typeof Clipboard.setString === 'function') {
      Clipboard.setString(passData.code);
    }
    setTimeout(() => setCopied(false), 2000);
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
      <View className="gap-2.5 pt-2">
        {/* WhatsApp QR Image Share Button */}
        <Button
          onPress={handleShareBarcodeImage}
          disabled={sharingImage}
          className="w-full h-12 rounded-xl bg-[#25D366] active:bg-[#1EBE5D] flex-row items-center justify-center gap-2.5 shadow-sm"
          accessibilityLabel="Share QR Code Image to WhatsApp"
        >
          {sharingImage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MessageCircle size={19} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="font-bold text-white text-sm">
                Share QR Image to WhatsApp
              </Text>
            </>
          )}
        </Button>

        {/* Action Row: Share Pass Text/QR & Copy Code */}
        <View className="flex-row gap-2">
          <Button
            variant="default"
            onPress={handleSharePassMessage}
            className="flex-1 h-11 rounded-xl bg-primary flex-row items-center justify-center gap-2"
          >
            <Share2 size={16} color="#fff" />
            <Text className="font-bold text-primary-foreground text-xs">
              Share Pass Message
            </Text>
          </Button>

          <Button
            variant="outline"
            onPress={handleCopyCode}
            className="h-11 px-4 rounded-xl border-border bg-card active:bg-muted flex-row items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check size={15} className="text-emerald-600" />
                <Text className="font-bold text-emerald-600 text-xs">Copied</Text>
              </>
            ) : (
              <>
                <Copy size={15} className="text-foreground" />
                <Text className="font-bold text-foreground text-xs">Copy Code</Text>
              </>
            )}
          </Button>
        </View>

        {/* Back to Dashboard */}
        <Button
          variant="outline"
          onPress={onDone}
          className="h-11 rounded-xl border-border flex-row items-center justify-center gap-2"
        >
          <Home size={16} className="text-foreground" />
          <Text className="font-semibold text-foreground text-sm">
            Back to Visitors Dashboard
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
};
