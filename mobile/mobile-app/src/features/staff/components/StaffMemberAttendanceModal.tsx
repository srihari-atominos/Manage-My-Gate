import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StaffAttendanceRecord } from '../services/staffService';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  ShieldAlert,
  UserCheck,
  Building,
} from 'lucide-react-native';

interface StaffMemberAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  staffName: string;
  department?: string;
  records: StaffAttendanceRecord[];
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
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }
  return isOpen ? 'In Progress' : '0m';
}

export const StaffMemberAttendanceModal: React.FC<StaffMemberAttendanceModalProps> = ({
  visible,
  onClose,
  staffName,
  department,
  records,
}) => {
  const totalCompleted = records.filter((r) => r.status === 'Closed').length;
  const currentlyOnSite = records.some((r) => r.status === 'Open');
  const totalMinutes = records.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`${staffName} - Attendance Report`}>
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Overview Header Card */}
        <View className="p-4 rounded-2xl bg-card border border-border mb-4 shadow-xs">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-base font-bold text-foreground">{staffName}</Text>
              <Text className="text-xs text-muted-foreground">{department || 'Community Staff'}</Text>
            </View>
            <StatusBadge
              variant={currentlyOnSite ? 'warning' : 'neutral'}
              label={currentlyOnSite ? 'Currently On-Site' : 'Off-Site'}
              dot={currentlyOnSite}
            />
          </View>

          {/* Quick Metrics */}
          <View className="flex-row gap-2 pt-2 border-t border-border/60">
            <View className="flex-1 p-2 rounded-xl bg-muted/40 items-center">
              <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Total Shifts</Text>
              <Text className="text-sm font-bold text-foreground mt-0.5">{records.length}</Text>
            </View>
            <View className="flex-1 p-2 rounded-xl bg-muted/40 items-center">
              <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Completed</Text>
              <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalCompleted}
              </Text>
            </View>
            <View className="flex-1 p-2 rounded-xl bg-muted/40 items-center">
              <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Hours Logged</Text>
              <Text className="text-sm font-bold text-primary mt-0.5">{totalHours}h</Text>
            </View>
          </View>
        </View>

        {/* Attendance Sessions Log */}
        <Text className="text-xs font-bold text-foreground mb-2 px-1">
          Gate Scans & Attendance Sessions ({records.length})
        </Text>

        {records.length === 0 ? (
          <View className="p-6 rounded-2xl bg-card border border-border items-center justify-center">
            <Clock size={24} className="text-muted-foreground/60 mb-2" />
            <Text className="text-xs text-muted-foreground text-center">
              No gate attendance sessions recorded for this staff member yet.
            </Text>
          </View>
        ) : (
          records.map((rec) => {
            const isOpen = rec.status === 'Open';
            return (
              <View
                key={rec._id}
                className="p-3.5 rounded-2xl bg-card border border-border mb-2.5 shadow-xs"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Calendar size={13} className="text-muted-foreground me-1.5" />
                    <Text className="text-xs font-bold text-foreground">
                      {formatDate(rec.checkInTime)}
                    </Text>
                  </View>
                  <StatusBadge
                    variant={isOpen ? 'warning' : 'success'}
                    label={isOpen ? 'In Progress' : 'Completed'}
                    size="sm"
                  />
                </View>

                {/* Entry & Exit times */}
                <View className="flex-row items-center justify-between p-2.5 rounded-xl bg-muted/40">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <LogIn size={11} className="text-emerald-600 dark:text-emerald-400 me-1" />
                      <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Entry</Text>
                    </View>
                    <Text className="text-xs font-bold text-foreground mt-0.5">
                      {formatTime(rec.checkInTime)}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {rec.checkInGate || 'Main Gate'}
                    </Text>
                  </View>

                  <View className="h-6 w-px bg-border mx-2" />

                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <LogOut size={11} className="text-primary me-1" />
                      <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Exit</Text>
                    </View>
                    <Text className="text-xs font-bold text-foreground mt-0.5">
                      {isOpen ? 'On-Site' : formatTime(rec.checkOutTime)}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {isOpen ? 'Active' : rec.exitGate || 'Main Gate'}
                    </Text>
                  </View>

                  <View className="h-6 w-px bg-border mx-2" />

                  <View className="items-end">
                    <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Duration</Text>
                    <Text className="text-xs font-bold text-foreground mt-0.5">
                      {formatDuration(rec.durationMinutes, isOpen)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View className="mt-4">
          <Button variant="outline" onPress={onClose}>
            <Text className="text-sm font-semibold">Close Report</Text>
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default StaffMemberAttendanceModal;
