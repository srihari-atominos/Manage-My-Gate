import React from 'react';
import { View, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { SecurityLog } from '../services/securityLogApi';

export interface SecurityLogDetailModalProps {
  visible: boolean;
  onClose: () => void;
  log: SecurityLog | null;
}

export function SecurityLogDetailModal({ visible, onClose, log }: SecurityLogDetailModalProps) {
  if (!visible || !log) return null;

  const isDenied = log.status === 'Denied' || log.scanType === 'Denied';
  const badgeVariant: StatusVariant = isDenied
    ? 'danger'
    : log.scanType === 'Exit'
    ? 'info'
    : log.scanType === 'Manual Verification'
    ? 'warning'
    : 'success';

  const formatScanTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (e) {
      try {
        const d = new Date(timeStr);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e2) {
        return timeStr;
      }
    }
  };

  const scanTimeFormatted = formatScanTime(log.scanTime);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Security Audit Log Details">
      <View className="py-2 items-center">
        {/* Header Avatar & Resident Info */}
        <View className="flex-row items-center gap-3 w-full bg-muted/20 p-3.5 rounded-2xl border border-border/40 mb-4">
          {log.residentPhoto ? (
            <Image
              source={{ uri: log.residentPhoto }}
              className="w-12 h-12 rounded-full border border-border"
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
              <Text className="text-primary font-bold text-base">
                {(log.residentName || 'R')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-bold text-base text-foreground">
              {log.residentName || 'Resident'}
            </Text>

            <View className="flex-row items-center gap-2 mt-1">
              <StatusBadge label={log.scanType || 'Scan Event'} variant={badgeVariant} size="sm" />
              {isDenied && <StatusBadge label="ACCESS DENIED" variant="danger" size="sm" />}
            </View>
          </View>
        </View>

        {/* Audit Trail Details */}
        <View className="w-full bg-muted/20 p-3.5 rounded-2xl border border-border/40 mb-4">
          <DetailRow label="Amenity Facility" value={log.amenityName || 'Community Amenity'} iconName="Building2" />
          <DetailRow label="Booking Reference" value={log.bookingReference || log.bookingId || 'N/A'} copyable={true} iconName="Hash" />
          <DetailRow label="Security Guard" value={log.guardName || 'Gate Security System'} iconName="ShieldCheck" />
          <DetailRow label="Scan Action Type" value={log.scanType || 'Scan'} iconName="QrCode" />
          <DetailRow label="Verification Result" value={log.status || 'Processed'} iconName="CheckCircle2" />
          {Boolean(log.reason || log.remarks) && (
            <DetailRow label="Remarks / Reason" value={log.reason || log.remarks || '-'} iconName="FileText" />
          )}
          <DetailRow label="Timestamp" value={scanTimeFormatted} iconName="Clock" isLast={true} />
        </View>

        <Button variant="outline" onPress={onClose} className="w-full">
          <Text className="font-semibold text-sm">Close Audit Log</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}

export default SecurityLogDetailModal;
