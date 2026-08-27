import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { QrCode, Search, ShieldCheck } from 'lucide-react-native';

export interface FullActivityLogsModalProps {
  visible: boolean;
  onClose: () => void;
  logs: any[];
  onSelectLog: (log: any) => void;
}

export function FullActivityLogsModal({
  visible,
  onClose,
  logs,
  onSelectLog,
}: FullActivityLogsModalProps) {
  const [search, setSearch] = useState('');

  if (!visible) return null;

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase().trim();
    const name = (log.residentName || log.userName || log.user?.name || '').toLowerCase();
    const unit = (log.unitInfo || log.unit || log.user?.unit || '').toLowerCase();
    const amenity = (log.amenityName || log.amenity?.name || '').toLowerCase();
    const ref = (log.bookingReference || log.bookingId || '').toLowerCase();
    return name.includes(query) || unit.includes(query) || amenity.includes(query) || ref.includes(query);
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Full Live Activity Logs">
      <View className="py-2 flex-1 max-h-[80vh]">
        {/* Search Bar */}
        <View className="mb-3">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search activity by name, unit, facility..."
          />
        </View>

        {/* Header subtitle */}
        <View className="flex-row items-center justify-between mb-3 px-1">
          <Text className="text-xs font-semibold text-muted-foreground">
            Total {filteredLogs.length} activity records logged
          </Text>
        </View>

        {/* Scrollable Log Feed */}
        <ScrollView className="flex-1 gap-2.5" contentContainerClassName="pb-6">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log: any, idx: number) => {
              const id = log.id || log._id || `full-log-${idx}`;
              const rawResidentName = log.residentName || log.userName || log.user?.name || log.userId?.name || 'Resident';
              const rawUnitInfo = log.unitInfo || log.unit || log.user?.unit || log.user?.villaNumber || log.villaNumber || log.flatNumber || 'Unit';
              
              const residentName = rawResidentName.includes('(') ? rawResidentName.split('(')[0].trim() : rawResidentName;
              const unitInfo = rawResidentName.includes('(') ? rawResidentName.split('(')[1]?.replace(')', '')?.trim() : rawUnitInfo;

              const amenityName = log.amenityName || log.amenity?.name || log.amenityId?.name || 'Facility';
              const bookingRef = log.bookingReference || log.bookingId || log._id || `BK-LOG-${idx + 101}`;
              const guardName = log.guardName || log.reviewedBy?.name || 'Gate Security System';

              let timeStr = log.timeStr || log.timeAgo || log.scannedAt || log.bookingDate || log.date || 'Just now';
              if (log.startTime && log.endTime) {
                timeStr = `${log.startTime} - ${log.endTime}`;
              }

              const rawStatus = String(log.statusLabel || log.status || log.action || log.scanType || 'CONFIRMED').toUpperCase();
              let statusLabel = log.statusLabel || 'CONFIRMED';
              let variant: StatusVariant = log.variant || 'info';

              if (!log.variant) {
                if (rawStatus === 'CHECKED_IN' || rawStatus === 'CHECKED-IN' || rawStatus === 'CHECK_IN' || rawStatus === 'SUCCESS' || rawStatus === 'ENTRY') {
                  statusLabel = 'CHECKED-IN';
                  variant = 'success';
                } else if (rawStatus === 'CONFIRMED' || rawStatus === 'APPROVED' || rawStatus === 'PAID') {
                  statusLabel = 'CONFIRMED';
                  variant = 'info';
                } else if (rawStatus === 'PENDING') {
                  statusLabel = 'PENDING';
                  variant = 'warning';
                } else if (rawStatus === 'EXPIRED' || rawStatus === 'EXIT') {
                  statusLabel = rawStatus === 'EXIT' ? 'EXIT' : 'EXPIRED';
                  variant = 'neutral';
                } else if (rawStatus === 'CANCELLED' || rawStatus === 'REJECTED' || rawStatus === 'FAILED' || rawStatus === 'DENIED') {
                  statusLabel = rawStatus === 'DENIED' ? 'DENIED' : 'CANCELLED';
                  variant = 'danger';
                }
              }

              const formattedRawLog = log.rawLog || {
                _id: String(id),
                residentName: `${residentName} (${unitInfo})`,
                residentPhoto: log.residentPhoto || log.user?.avatar || null,
                amenityName,
                guardName,
                bookingId: String(id),
                bookingReference: String(bookingRef),
                scanType: log.scanType || (statusLabel === 'CHECKED-IN' ? 'Entry' : statusLabel === 'EXIT' ? 'Exit' : statusLabel),
                status: log.status || statusLabel,
                reason: log.reason || log.remarks || log.cancellationReason || `Activity logged for ${amenityName}`,
                remarks: log.remarks || `Time Window: ${timeStr}`,
                scanTime: log.scanTime || log.createdAt || log.updatedAt || new Date().toISOString(),
              };

              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    onClose();
                    onSelectLog(formattedRawLog);
                  }}
                  className="p-3.5 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/50 active:bg-muted/60 mb-2"
                >
                  <View className="flex-row items-center justify-between gap-2 mb-2">
                    <View className="flex-row items-center gap-2.5 flex-1 me-2">
                      <View className="w-7.5 h-7.5 rounded-full bg-primary/10 items-center justify-center shrink-0">
                        <QrCode size={15} color="#0084FF" />
                      </View>
                      <Text className="text-xs font-bold text-foreground flex-1" numberOfLines={1}>
                        {residentName} <Text className="font-normal text-muted-foreground">({unitInfo})</Text>
                      </Text>
                    </View>
                    <StatusBadge label={statusLabel} variant={variant} size="sm" />
                  </View>

                  <View className="flex-row items-center justify-between gap-2 ps-10">
                    <Text className="text-[11px] font-semibold text-muted-foreground flex-1" numberOfLines={1}>
                      {amenityName}
                    </Text>
                    <Text className="text-[11px] font-semibold text-primary/80 shrink-0">
                      {timeStr}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View className="p-6 items-center justify-center">
              <Text className="text-xs font-medium text-muted-foreground text-center">
                No activity logs match "{search}"
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

export default FullActivityLogsModal;
