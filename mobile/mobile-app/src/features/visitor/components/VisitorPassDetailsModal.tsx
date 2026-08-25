import React from 'react';
import { View, TouchableOpacity, Share } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/DetailRow';
import { VisitorPass } from '../store/visitorPassSlice';
import { VisitorQRCode } from './shared/VisitorQRCode';
import { QrCode, ShieldAlert, Copy, Check, Share2 } from 'lucide-react-native';

export interface VisitorPassDetailsModalProps {
  visible: boolean;
  pass: VisitorPass | null;
  onClose: () => void;
  onRevokePress?: (pass: VisitorPass) => void;
}

const mapPassStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REVOKED':
      return 'danger';
    case 'EXPIRED':
      return 'neutral';
    default:
      return 'neutral';
  }
};

export const VisitorPassDetailsModal: React.FC<VisitorPassDetailsModalProps> = ({
  visible,
  pass,
  onClose,
  onRevokePress,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showQR, setShowQR] = React.useState(false);

  if (!pass) return null;

  const passCode = pass.code || pass._id.slice(-6).toUpperCase();

  const handleCopyCode = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSharePass = async () => {
    if (!passCode) return;
    const shareMessage =
      `*Manage-My-Gate Visitor Pass*\n\n` +
      `Visitor Name: ${pass.visitorName || 'Guest'}\n` +
      `Entry Pass Code: ${passCode}\n` +
      `Valid Until: ${pass.validUntil ? new Date(pass.validUntil).toLocaleString() : 'Today'}\n\n` +
      `Please show this 6-digit passcode or QR code at the security gate for entry.`;

    try {
      await Share.share({
        title: 'Visitor Entry Pass',
        message: shareMessage,
      });
    } catch (err) {
      console.log('Error sharing pass', err);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Visitor Pass Details">
      <View className="gap-4 p-2 pb-6">
        {/* Pass Code Badge */}
        <View className="bg-primary/10 border border-primary/20 rounded-2xl p-4 items-center justify-center gap-2">
          <Text variant="muted" className="text-xs uppercase font-bold text-muted-foreground">
            Entry Pass Keycode
          </Text>
          <Text className="text-3xl font-extrabold text-primary tracking-widest font-mono">
            {passCode}
          </Text>
          <TouchableOpacity
            onPress={handleCopyCode}
            activeOpacity={0.7}
            className="flex-row items-center gap-1.5 bg-card px-3 py-1.5 rounded-full border border-border mt-1"
          >
            {copied ? (
              <Check size={14} className="text-status-success" />
            ) : (
              <Copy size={14} className="text-muted-foreground" />
            )}
            <Text className="text-xs font-semibold text-foreground">
              {copied ? 'Copied' : 'Copy Keycode'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Share & Show QR Action Bar */}
        <View className="flex-row gap-2">
          <Button
            variant="default"
            onPress={handleSharePass}
            className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Share2 size={16} className="text-primary-foreground" />
            <Text className="font-bold text-primary-foreground text-xs">
              Share Pass & Code
            </Text>
          </Button>

          <Button
            variant="outline"
            onPress={() => setShowQR(!showQR)}
            className="h-11 px-3.5 rounded-xl flex-row items-center justify-center gap-1.5"
          >
            <QrCode size={16} className="text-foreground" />
            <Text className="font-bold text-foreground text-xs">
              {showQR ? 'Hide QR' : 'Show QR'}
            </Text>
          </Button>
        </View>

        {/* QR Code Presentation */}
        {showQR && (
          <VisitorQRCode
            code={passCode}
            validityText={`Valid for ${pass.visitorName || 'Guest'}`}
          />
        )}

        {/* Status Pill */}
        <View className="flex-row items-center justify-between bg-card border border-border rounded-xl p-3">
          <Text variant="small" className="font-semibold text-foreground">
            Pass Status
          </Text>
          <StatusBadge label={pass.status} variant={mapPassStatusVariant(pass.status)} dot />
        </View>

        {/* Detailed Attribute Rows */}
        <View className="bg-card border border-border rounded-xl p-3 gap-2">
          <DetailRow label="Visitor Name" value={pass.visitorName || 'Guest'} />
          <DetailRow label="Phone Number" value={pass.phone || 'Not provided'} />
          {pass.purpose ? <DetailRow label="Purpose" value={pass.purpose} /> : null}
          {pass.validFrom ? (
            <DetailRow
              label="Valid From"
              value={new Date(pass.validFrom).toLocaleDateString()}
            />
          ) : null}
          {pass.validUntil ? (
            <DetailRow
              label="Valid Until"
              value={new Date(pass.validUntil).toLocaleDateString()}
            />
          ) : null}
        </View>

        {/* Action Button: Revoke Pass */}
        {pass.status === 'ACTIVE' || pass.status === 'PENDING' ? (
          <Button
            variant="destructive"
            onPress={() => {
              onClose();
              onRevokePress?.(pass);
            }}
            className="mt-2 h-12 rounded-xl flex-row items-center justify-center gap-2"
          >
            <ShieldAlert size={18} className="text-destructive-foreground" />
            <Text className="font-bold text-destructive-foreground text-sm">Revoke Visitor Pass</Text>
          </Button>
        ) : null}
      </View>
    </BottomSheet>
  );
};

export default VisitorPassDetailsModal;
