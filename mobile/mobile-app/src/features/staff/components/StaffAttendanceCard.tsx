import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StaffAttendanceRecord } from '../services/staffService';
import { Clock, LogIn, LogOut, ShieldAlert, User } from 'lucide-react-native';

export interface StaffAttendanceCardProps {
  record: StaffAttendanceRecord;
}

function formatTime(isoString?: string | null): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatDuration(minutes?: number | null, isOpen?: boolean): string {
  if (minutes !== undefined && minutes !== null) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  }
  return isOpen ? 'In Progress' : '0m';
}

export const StaffAttendanceCard: React.FC<StaffAttendanceCardProps> = ({ record }) => {
  const staffObj = typeof record.technicianId === 'object' && record.technicianId ? record.technicianId : null;
  const staffName = staffObj?.name || record.staffCode || 'Staff Member';
  const staffDepartment = staffObj?.department || 'General';
  const staffCode = record.staffCode || staffObj?.staffCode || '';

  const isOpen = record.status === 'Open';
  const isMissing = Boolean(record.isMissingCheckout);

  return (
    <View className="p-4 rounded-2xl bg-card border border-border mb-3 shadow-xs">
      {/* Header: Name, Department, Status Badge */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 me-2">
          <View className="h-10 w-10 rounded-xl bg-primary/10 items-center justify-center me-3">
            <User size={18} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
              {staffName}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-xs text-muted-foreground me-2">
                {staffDepartment}
              </Text>
              {staffCode ? (
                <View className="px-1.5 py-0.5 rounded bg-muted">
                  <Text className="text-[10px] font-semibold text-muted-foreground">
                    {staffCode}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Status Badge */}
        {isMissing ? (
          <StatusBadge variant="danger" label="Missing Checkout" dot size="sm" />
        ) : isOpen ? (
          <StatusBadge variant="warning" label="On-Site" dot size="sm" />
        ) : (
          <StatusBadge variant="success" label="Completed" size="sm" />
        )}
      </View>

      {/* Missing Checkout Alert Banner */}
      {isMissing ? (
        <View className="mb-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 flex-row items-center">
          <ShieldAlert size={14} className="text-destructive me-2" />
          <Text className="text-xs text-destructive font-medium flex-1">
            Session open for over 12 hours without exit scan. Manual admin review required.
          </Text>
        </View>
      ) : null}

      {/* Gate Entry & Exit Details */}
      <View className="flex-row items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
        {/* Check-In */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center mb-1">
            <LogIn size={13} className="text-emerald-600 dark:text-emerald-400 me-1" />
            <Text className="text-[11px] font-semibold text-muted-foreground uppercase" numberOfLines={1}>
              Entry Gate
            </Text>
          </View>
          <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
            {formatTime(record.checkInTime)}
          </Text>
          <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
            {record.checkInGate || 'Main Gate'}
          </Text>
        </View>

        {/* Divider */}
        <View className="h-8 w-px bg-border mx-2" />

        {/* Check-Out */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center mb-1">
            <LogOut size={13} className="text-primary me-1" />
            <Text className="text-[11px] font-semibold text-muted-foreground uppercase" numberOfLines={1}>
              Exit Gate
            </Text>
          </View>
          <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
            {isOpen ? 'In Progress' : formatTime(record.checkOutTime)}
          </Text>
          <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
            {isOpen ? 'Active On-Site' : record.exitGate || 'Main Gate'}
          </Text>
        </View>

        {/* Divider */}
        <View className="h-8 w-px bg-border mx-2" />

        {/* Duration */}
        <View className="items-end min-w-[65px]">
          <View className="flex-row items-center mb-1">
            <Clock size={12} className="text-muted-foreground me-1" />
            <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
              Duration
            </Text>
          </View>
          <View className="px-2 py-0.5 rounded-full bg-card border border-border items-center">
            <Text className="text-xs font-bold text-foreground">
              {formatDuration(record.durationMinutes, isOpen)}
            </Text>
          </View>
        </View>
      </View>

      {/* Date & Session ID subtle footer */}
      <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-border/50">
        <Text className="text-[11px] text-muted-foreground">
          {formatDate(record.checkInTime)}
        </Text>
        <Text className="text-[10px] text-muted-foreground/60 font-mono">
          Session #{record._id.slice(-6)}
        </Text>
      </View>
    </View>
  );
};

export default StaffAttendanceCard;
