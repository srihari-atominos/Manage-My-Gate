import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { SecurityLog } from '../services/securityLogApi';
import {
  DoorOpen,
  DoorClosed,
  ShieldAlert,
  QrCode,
  Clock,
  Building2,
  Hash,
  ShieldCheck,
} from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface AmenitySecurityLogCardProps {
  log: SecurityLog;
  onPress?: (log: SecurityLog) => void;
  className?: string;
}

export const AmenitySecurityLogCard: React.FC<AmenitySecurityLogCardProps> = ({
  log,
  onPress,
  className,
}) => {
  const isDenied = log.status === 'Denied' || log.scanType === 'Denied';
  const isExit = log.scanType === 'Exit';
  const isManual = log.scanType === 'Manual Verification';

  const statusLabel = isDenied
    ? 'DENIED'
    : isExit
    ? 'EXIT'
    : isManual
    ? 'MANUAL'
    : 'ENTRY';

  const statusVariant: StatusVariant = isDenied
    ? 'danger'
    : isExit
    ? 'info'
    : isManual
    ? 'warning'
    : 'success';

  const getLeftIconConfig = () => {
    if (isDenied) return { icon: ShieldAlert, bg: 'bg-destructive/15' };
    if (isExit) return { icon: DoorClosed, bg: 'bg-status-info/15' };
    if (isManual) return { icon: QrCode, bg: 'bg-status-warning/15' };
    return { icon: DoorOpen, bg: 'bg-status-success/15' };
  };

  const { icon: LeftIcon, bg: leftIconBg } = getLeftIconConfig();

  const scanTimeFormatted = log.scanTime
    ? new Date(log.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '-';

  const bookingRef = log.bookingReference || log.bookingId;

  return (
    <ListCard
      title={log.amenityName || 'Amenity Gate Access'}
      subtitle={`Resident: ${log.residentName || 'Resident'} • ${scanTimeFormatted}`}
      leftIcon={LeftIcon}
      leftIconBgColor={leftIconBg}
      status={{
        label: statusLabel,
        variant: statusVariant,
      }}
      onPress={() => onPress?.(log)}
      className={cn('mb-2.5', className)}
    >
      <View className="pt-2 border-t border-border/40 gap-1.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <ShieldCheck size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">
              Guard: <Text className="font-semibold text-foreground">{log.guardName || 'Security Gate'}</Text>
            </Text>
          </View>

          {bookingRef ? (
            <View className="flex-row items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
              <Hash size={11} className="text-muted-foreground" />
              <Text className="text-[10px] font-mono font-bold text-foreground">
                {bookingRef.slice(0, 10)}
              </Text>
            </View>
          ) : null}
        </View>

        {Boolean(log.reason || log.remarks) && (
          <View className="mt-1 bg-destructive/10 p-2 rounded-lg border border-destructive/20">
            <Text className="text-[11px] font-medium text-destructive">
              Reason: {log.reason || log.remarks}
            </Text>
          </View>
        )}
      </View>
    </ListCard>
  );
};

export default AmenitySecurityLogCard;
