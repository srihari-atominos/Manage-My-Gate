import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { QrCode, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { useSecurityLogs } from '../hooks/useSecurityLogs';
import { SecurityLogDetailModal } from './SecurityLogDetailModal';
import { FullActivityLogsModal } from './FullActivityLogsModal';

export function MobileLiveActivityWidget() {
  const router = useRouter();
  const { logs } = useSecurityLogs();
  const { adminBookings, myBookings, dashboardStats } = useSelector(
    (state: RootState) => state.amenityBookings
  );
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isFullLogsOpen, setIsFullLogsOpen] = useState(false);

  // Combine real-time security logs, master admin bookings, and personal resident bookings
  const rawList = [
    ...(logs || []),
    ...(adminBookings || []),
    ...(myBookings || []),
    ...(dashboardStats?.recentScans || dashboardStats?.recentActivities || []),
  ];

  const fallbackList = [
    {
      id: '1',
      residentName: 'Rahul Sharma',
      unitInfo: 'Villa 102',
      amenityName: 'Swimming Pool',
      timeStr: '10:00 AM - 11:00 AM',
      statusLabel: 'CHECKED-IN',
      variant: 'success' as const,
      rawLog: {
        _id: '1',
        residentName: 'Rahul Sharma (Villa 102)',
        amenityName: 'Swimming Pool',
        guardName: 'Gate Security System',
        bookingReference: 'BK-APP-8842',
        scanType: 'Entry',
        status: 'Success',
        reason: 'QR Pass scanned and verified successfully at Pool Gate',
        remarks: 'Slot: 10:00 AM - 11:00 AM',
        scanTime: new Date().toISOString(),
      },
    },
    {
      id: '2',
      residentName: 'Ananya Roy',
      unitInfo: 'Flat 404-B',
      amenityName: 'Tennis Court #1',
      timeStr: '02:00 PM - 03:00 PM',
      statusLabel: 'CONFIRMED',
      variant: 'info' as const,
      rawLog: {
        _id: '2',
        residentName: 'Ananya Roy (Flat 404-B)',
        amenityName: 'Tennis Court #1',
        guardName: 'Automated Booking System',
        bookingReference: 'BK-APP-9104',
        scanType: 'Booking Confirmed',
        status: 'Confirmed',
        reason: 'Slot reserved via Resident App with Wallet Payment',
        remarks: 'Slot: 02:00 PM - 03:00 PM',
        scanTime: new Date(Date.now() - 30 * 60000).toISOString(),
      },
    },
    {
      id: '3',
      residentName: 'Vikram Seth',
      unitInfo: 'Villa 45',
      amenityName: 'Gym Fitness Center',
      timeStr: '06:00 PM - 07:00 PM',
      statusLabel: 'EXPIRED',
      variant: 'neutral' as const,
      rawLog: {
        _id: '3',
        residentName: 'Vikram Seth (Villa 45)',
        amenityName: 'Gym Fitness Center',
        guardName: 'Gate Security System',
        bookingReference: 'BK-APP-7712',
        scanType: 'QR Expired',
        status: 'Expired',
        reason: 'QR pass expired due to unutilized slot time window',
        remarks: 'Slot: 06:00 PM - 07:00 PM',
        scanTime: new Date(Date.now() - 120 * 60000).toISOString(),
      },
    },
  ];

  const activeLogs = rawList.length > 0
    ? rawList.slice(0, 4).map((log: any, idx: number) => {
        const id = log.id || log._id || log.bookingId || `log-${idx}`;
        const residentName = log.residentName || log.userName || log.user?.name || log.userId?.name || 'Resident';
        const unitInfo = log.unitInfo || log.unit || log.user?.unit || log.user?.villaNumber || log.villaNumber || log.flatNumber || 'Unit';
        const amenityName = log.amenityName || log.amenity?.name || log.amenityId?.name || 'Facility';
        const bookingRef = log.bookingReference || log.bookingId || log._id || `BK-LOG-${idx + 101}`;
        const guardName = log.guardName || log.reviewedBy?.name || 'Gate Security System';

        let timeStr = log.timeAgo || log.scannedAt || log.bookingDate || log.date || 'Just now';
        if (log.startTime && log.endTime) {
          timeStr = `${log.startTime} - ${log.endTime}`;
        }

        const rawStatus = String(log.status || log.action || log.scanType || 'CONFIRMED').toUpperCase();
        let statusLabel = 'CONFIRMED';
        let variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' = 'info';

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

        const rawLog = {
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

        return {
          id,
          residentName,
          unitInfo,
          amenityName,
          timeStr,
          statusLabel,
          variant,
          rawLog,
        };
      })
    : fallbackList;

  const logsForModal = rawList.length > 0 ? rawList : fallbackList;

  return (
    <View className="bg-card p-5 rounded-2xl border border-border/70 mb-6 shadow-xs">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2.5 flex-1 pe-2">
          <View className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
            <ShieldCheck size={18} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text variant="large" className="font-bold text-foreground" numberOfLines={1}>
              Live Activity Logs
            </Text>
            <Text variant="muted" className="text-[11px] text-muted-foreground mt-0.5">
              Real-time QR scan & activity feed
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
          <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            LIVE TICKER
          </Text>
        </View>
      </View>

      <View className="gap-3 mb-4">
        {activeLogs.map((item: any) => (
          <Pressable
            key={item.id}
            onPress={() => setSelectedLog(item.rawLog)}
            className="p-3.5 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/50 active:bg-muted/60"
          >
            {/* Top Row: Resident Name & Unit (Left) | Status Badge (Right) */}
            <View className="flex-row items-center justify-between gap-2 mb-2">
              <View className="flex-row items-center gap-2.5 flex-1 me-2">
                <View className="w-7.5 h-7.5 rounded-full bg-primary/10 items-center justify-center shrink-0">
                  <QrCode size={15} color="#0084FF" />
                </View>
                <Text className="text-xs font-bold text-foreground flex-1" numberOfLines={1}>
                  {item.residentName} <Text className="font-normal text-muted-foreground">({item.unitInfo})</Text>
                </Text>
              </View>
              <StatusBadge
                label={item.statusLabel}
                variant={item.variant}
                size="sm"
              />
            </View>

            {/* Bottom Row: Amenity Name (Left) | Time Slot (Right) */}
            <View className="flex-row items-center justify-between gap-2 ps-10">
              <Text className="text-[11px] font-semibold text-muted-foreground flex-1" numberOfLines={1}>
                {item.amenityName}
              </Text>
              <Text className="text-[11px] font-semibold text-primary/80 shrink-0">
                {item.timeStr}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setIsFullLogsOpen(true)}
        className="flex-row items-center justify-center gap-2 pt-3.5 border-t border-border/50 active:opacity-75"
      >
        <Text className="text-xs font-bold text-primary">View Full Activity Logs</Text>
        <ArrowRight size={14} color="#0084FF" />
      </Pressable>

      {/* Full Activity Logs Feed Bottom Sheet */}
      <FullActivityLogsModal
        visible={isFullLogsOpen}
        onClose={() => setIsFullLogsOpen(false)}
        logs={logsForModal}
        onSelectLog={(log) => setSelectedLog(log)}
      />

      {/* Log Detail Modal */}
      <SecurityLogDetailModal
        visible={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </View>
  );
}

