import React from 'react';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { VisitorPass } from '../store/visitorPassSlice';
import { QrCode } from 'lucide-react-native';

export interface VisitorPassCardProps {
  pass: VisitorPass;
  onPress: (pass: VisitorPass) => void;
  onShowQR: (pass: VisitorPass) => void;
  villaBadge?: string;
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

/**
 * VisitorPassCard Component
 * Canonical ListCard implementation for Resident and Admin Visitor Passes.
 * Renders visitor entry credentials, villa badges, validity timestamps, and QR triggers.
 */
export const VisitorPassCard: React.FC<VisitorPassCardProps> = ({
  pass,
  onPress,
  onShowQR,
  villaBadge,
}) => {
  const displayVilla =
    villaBadge ||
    (pass as any).villaName ||
    (pass as any).villaNumber ||
    (pass as any).villaId?.name ||
    (pass as any).villaId?.number;

  const subtitleParts = [];
  if (displayVilla) subtitleParts.push(`Villa: ${displayVilla}`);
  if (pass.phone) subtitleParts.push(`Ph: ${pass.phone}`);
  else if (pass.purpose) subtitleParts.push(`For: ${pass.purpose}`);
  else subtitleParts.push(`Code: ${pass.code || pass._id?.slice(-6)}`);

  const subtitle = subtitleParts.join(' • ');

  return (
    <ListCard
      title={pass.visitorName || 'Guest Visitor'}
      subtitle={subtitle}
      leftIcon="QrCode"
      leftIconBgColor="bg-primary/10"
      timestamp={pass.validFrom || (pass as any).createdAt}
      status={{
        label: pass.status,
        variant: mapPassStatusVariant(pass.status),
      }}
      onPress={() => onPress(pass)}
      rightContent={
        <Button
          variant="outline"
          size="sm"
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onShowQR(pass);
          }}
          className="flex-row items-center gap-1.5 h-8 px-2.5 rounded-lg border-border"
          accessibilityRole="button"
          accessibilityLabel={`Show QR pass code for ${pass.visitorName || 'visitor'}`}
        >
          <QrCode size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">Pass Code</Text>
        </Button>
      }
    />
  );
};

export default VisitorPassCard;
