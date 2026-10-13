import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  StaffMember,
  StaffAttendanceRecord,
  StaffUnitAssociation,
  staffService,
} from '../services/staffService';
import {
  User,
  Calendar,
  Home,
  Clock,
  LogIn,
  LogOut,
  Edit3,
  Building,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  History,
} from 'lucide-react-native';

interface StaffDetailModalProps {
  visible: boolean;
  member: StaffMember | null;
  canManage: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

type TabKey = 'profile' | 'attendance' | 'units_activities';

const getStatusVariant = (status?: string): StatusVariant => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Inactive':
    default:
      return 'neutral';
  }
};

const getAssociationStatusVariant = (status?: string): StatusVariant => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Rejected':
    case 'Suspended':
      return 'danger';
    case 'Inactive':
    default:
      return 'neutral';
  }
};

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

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  visible,
  member,
  canManage,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);

  // Unit Associations state
  const [associations, setAssociations] = useState<StaffUnitAssociation[]>([]);
  const [loadingAssociations, setLoadingAssociations] = useState(false);
  const [associationsLoaded, setAssociationsLoaded] = useState(false);

  // Reset tab and data state on member/visibility change
  useEffect(() => {
    if (visible && member) {
      setActiveTab('profile');
      setAttendanceLoaded(false);
      setAssociationsLoaded(false);
      setAttendanceRecords([]);
      setAssociations([]);
    }
  }, [visible, member?._id]);

  // Lazy-load Attendance data when Attendance or Unit/Activities tab is opened
  useEffect(() => {
    if (!visible || !member?._id) return;

    if ((activeTab === 'attendance' || activeTab === 'units_activities') && !attendanceLoaded && !loadingAttendance) {
      setLoadingAttendance(true);
      staffService
        .getAttendanceHistory({ technicianId: member._id, limit: 50 })
        .then((res) => {
          setAttendanceRecords(res.records || []);
          setAttendanceLoaded(true);
        })
        .catch(() => {
          setAttendanceRecords([]);
          setAttendanceLoaded(true);
        })
        .finally(() => {
          setLoadingAttendance(false);
        });
    }

    if (activeTab === 'units_activities' && !associationsLoaded && !loadingAssociations) {
      setLoadingAssociations(true);
      staffService
        .getUnitAssociations({ technicianId: member._id, status: 'ALL' })
        .then((data) => {
          setAssociations(data || []);
          setAssociationsLoaded(true);
        })
        .catch(() => {
          setAssociations([]);
          setAssociationsLoaded(true);
        })
        .finally(() => {
          setLoadingAssociations(false);
        });
    }
  }, [activeTab, visible, member?._id, attendanceLoaded, associationsLoaded, loadingAttendance, loadingAssociations]);

  // Attendance summary metrics
  const attendanceMetrics = useMemo(() => {
    const total = attendanceRecords.length;
    const completed = attendanceRecords.filter((r) => r.status === 'Closed').length;
    const currentlyOnSite = attendanceRecords.some((r) => r.status === 'Open');
    const totalMinutes = attendanceRecords.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const missingCheckout = attendanceRecords.filter((r) => r.isMissingCheckout).length;

    return { total, completed, currentlyOnSite, totalHours, missingCheckout };
  }, [attendanceRecords]);

  // Combined activity timeline for Tab 3
  const timelineActivities = useMemo(() => {
    interface ActivityItem {
      id: string;
      title: string;
      subtitle: string;
      timestamp: string;
      type: 'entry' | 'exit' | 'unit_assigned' | 'created';
    }

    const items: ActivityItem[] = [];

    // Add attendance entries and exits
    attendanceRecords.forEach((rec) => {
      if (rec.checkInTime) {
        items.push({
          id: `in-${rec._id}`,
          title: 'Gate Check-In',
          subtitle: `Entered via ${rec.checkInGate || 'Main Gate'}`,
          timestamp: rec.checkInTime,
          type: 'entry',
        });
      }
      if (rec.checkOutTime) {
        items.push({
          id: `out-${rec._id}`,
          title: 'Gate Check-Out',
          subtitle: `Exited via ${rec.exitGate || 'Main Gate'} (${formatDuration(rec.durationMinutes)})`,
          timestamp: rec.checkOutTime,
          type: 'exit',
        });
      }
    });

    // Add unit association events
    associations.forEach((assoc) => {
      const unitNum = assoc.villaId?.unitNumber ? `Unit ${assoc.villaId.unitNumber}` : 'Assigned Unit';
      if (assoc.createdAt) {
        items.push({
          id: `assoc-${assoc._id}`,
          title: 'Unit Association Added',
          subtitle: `Allocated to ${unitNum} (${assoc.status})`,
          timestamp: assoc.createdAt,
          type: 'unit_assigned',
        });
      }
    });

    // Sort descending by timestamp
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
  }, [attendanceRecords, associations]);

  if (!member) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Staff Profile Details">
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header Summary */}
        <View className="mb-3 p-4 rounded-2xl bg-card border border-border items-center">
          <View className="h-14 w-14 rounded-full bg-primary/10 items-center justify-center mb-2">
            <Text className="text-lg font-bold text-primary">
              {(member.name || 'S').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text className="text-lg font-bold text-foreground text-center">
            {member.name}
          </Text>
          {member.designation ? (
            <Text className="text-sm text-muted-foreground text-center mt-0.5">
              {member.designation}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2 mt-2.5">
            <StatusBadge
              label={member.status}
              variant={getStatusVariant(member.status)}
              size="sm"
            />
            <StatusBadge label={member.type} variant="info" size="sm" />
          </View>
        </View>

        {/* 3-Section Segmented Navigation Bar */}
        <View className="flex-row p-1 bg-muted/60 rounded-xl mb-3 border border-border/60">
          <TouchableOpacity
            onPress={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-1 rounded-lg items-center justify-center flex-row ${
              activeTab === 'profile' ? 'bg-card shadow-xs' : ''
            }`}
            activeOpacity={0.7}
          >
            <User
              size={13}
              className={`me-1.5 ${
                activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'profile' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('attendance')}
            className={`flex-1 py-2 px-1 rounded-lg items-center justify-center flex-row ${
              activeTab === 'attendance' ? 'bg-card shadow-xs' : ''
            }`}
            activeOpacity={0.7}
          >
            <Calendar
              size={13}
              className={`me-1.5 ${
                activeTab === 'attendance' ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'attendance' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('units_activities')}
            className={`flex-1 py-2 px-1 rounded-lg items-center justify-center flex-row ${
              activeTab === 'units_activities' ? 'bg-card shadow-xs' : ''
            }`}
            activeOpacity={0.7}
          >
            <Home
              size={13}
              className={`me-1.5 ${
                activeTab === 'units_activities' ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'units_activities' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Unit & Activities
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= TAB 1: PROFILE ================= */}
        {activeTab === 'profile' && (
          <View>
            {/* Employment Specifications */}
            <View className="mb-3">
              <Text className="text-xs font-bold text-foreground mb-1.5 px-1 uppercase tracking-wide">
                Employment Specifications
              </Text>
              <View className="rounded-2xl bg-card border border-border px-3.5 py-1">
                <DetailRow label="Department" value={member.department} />
                <DetailRow label="Role / Designation" value={member.designation || 'Staff Member'} />
                {member.staffCode ? (
                  <DetailRow label="Staff Code" value={member.staffCode} copyable />
                ) : null}
                <DetailRow label="Employment Type" value={member.type} />
                <DetailRow label="Status" value={member.status} isLast />
              </View>
            </View>

            {/* Contact & Account Specifications */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-foreground mb-1.5 px-1 uppercase tracking-wide">
                Contact & Communication
              </Text>
              <View className="rounded-2xl bg-card border border-border px-3.5 py-1">
                <DetailRow label="Phone" value={member.phone} copyable />
                <DetailRow
                  label="Email"
                  value={member.email || 'Not provided'}
                  copyable={Boolean(member.email)}
                />
                <DetailRow
                  label="WhatsApp Notifications"
                  value={member.whatsappEnabled ? 'Enabled' : 'Disabled'}
                />
                {member.userId ? (
                  <DetailRow
                    label="Account Sync"
                    value="Linked & Active"
                    isLast
                  />
                ) : (
                  <DetailRow
                    label="Account Sync"
                    value="Standalone Profile"
                    isLast
                  />
                )}
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 2: ATTENDANCE ================= */}
        {activeTab === 'attendance' && (
          <View>
            {/* Metric Highlights */}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 p-2.5 rounded-xl bg-card border border-border items-center">
                <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Total Sessions</Text>
                <Text className="text-sm font-bold text-foreground mt-0.5">{attendanceMetrics.total}</Text>
              </View>
              <View className="flex-1 p-2.5 rounded-xl bg-card border border-border items-center">
                <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Completed</Text>
                <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {attendanceMetrics.completed}
                </Text>
              </View>
              <View className="flex-1 p-2.5 rounded-xl bg-card border border-border items-center">
                <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Hours Logged</Text>
                <Text className="text-sm font-bold text-primary mt-0.5">{attendanceMetrics.totalHours}h</Text>
              </View>
              <View className="flex-1 p-2.5 rounded-xl bg-card border border-border items-center">
                <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Gate Status</Text>
                <Text className={`text-xs font-bold mt-1 ${attendanceMetrics.currentlyOnSite ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {attendanceMetrics.currentlyOnSite ? 'On-Site' : 'Off-Site'}
                </Text>
              </View>
            </View>

            {/* Attendance History List */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-foreground mb-2 px-1">
                Gate Attendance Records ({attendanceRecords.length})
              </Text>

              {loadingAttendance ? (
                <View className="p-8 rounded-2xl bg-card border border-border items-center justify-center">
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text className="text-xs text-muted-foreground mt-2">Loading attendance logs...</Text>
                </View>
              ) : attendanceRecords.length === 0 ? (
                <View className="p-6 rounded-2xl bg-card border border-border items-center justify-center">
                  <Clock size={24} className="text-muted-foreground/60 mb-2" />
                  <Text className="text-xs text-muted-foreground text-center">
                    No gate attendance logs recorded for this staff member.
                  </Text>
                </View>
              ) : (
                attendanceRecords.map((rec) => {
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
            </View>
          </View>
        )}

        {/* ================= TAB 3: UNIT & ACTIVITIES ================= */}
        {activeTab === 'units_activities' && (
          <View>
            {/* Subsection A: Linked Units / Households */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-foreground mb-2 px-1 uppercase tracking-wide">
                Linked Units & Allocations ({associations.length})
              </Text>

              {loadingAssociations ? (
                <View className="p-6 rounded-2xl bg-card border border-border items-center justify-center">
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text className="text-xs text-muted-foreground mt-2">Loading unit allocations...</Text>
                </View>
              ) : associations.length === 0 ? (
                <View className="p-5 rounded-2xl bg-card border border-border items-center justify-center">
                  <Home size={22} className="text-muted-foreground/60 mb-1.5" />
                  <Text className="text-xs text-muted-foreground text-center">
                    No household or unit allocations currently linked.
                  </Text>
                </View>
              ) : (
                associations.map((assoc) => (
                  <View
                    key={assoc._id}
                    className="p-3.5 rounded-2xl bg-card border border-border mb-2 shadow-xs"
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center">
                        <Building size={14} className="text-primary me-1.5" />
                        <Text className="text-xs font-bold text-foreground">
                          {assoc.villaId?.unitNumber
                            ? `Unit ${assoc.villaId.unitNumber}`
                            : 'Community Property'}
                        </Text>
                        {assoc.villaId?.blockOrBuilding ? (
                          <Text className="text-xs text-muted-foreground ms-1">
                            ({assoc.villaId.blockOrBuilding})
                          </Text>
                        ) : null}
                      </View>
                      <StatusBadge
                        label={assoc.status}
                        variant={getAssociationStatusVariant(assoc.status)}
                        size="sm"
                      />
                    </View>

                    <View className="flex-row items-center justify-between mt-1 pt-1.5 border-t border-border/50">
                      <Text className="text-[11px] text-muted-foreground">
                        {assoc.roleOrTrade || member.department || 'General Service'}
                      </Text>
                      {assoc.accessSchedule?.days && assoc.accessSchedule.days.length > 0 ? (
                        <Text className="text-[11px] text-muted-foreground">
                          {assoc.accessSchedule.days.slice(0, 3).join(', ')}
                          {assoc.accessSchedule.days.length > 3 ? '...' : ''}
                        </Text>
                      ) : (
                        <Text className="text-[11px] text-muted-foreground">Full Access</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Subsection B: Activity Timeline */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-foreground mb-2 px-1 uppercase tracking-wide">
                Staff Activity Timeline
              </Text>

              {timelineActivities.length === 0 ? (
                <View className="p-5 rounded-2xl bg-card border border-border items-center justify-center">
                  <History size={22} className="text-muted-foreground/60 mb-1.5" />
                  <Text className="text-xs text-muted-foreground text-center">
                    No recent activity records available.
                  </Text>
                </View>
              ) : (
                <View className="rounded-2xl bg-card border border-border p-3">
                  {timelineActivities.map((act, index) => {
                    const isLast = index === timelineActivities.length - 1;
                    return (
                      <View key={act.id} className="flex-row items-start mb-2.5">
                        {/* Timeline Icon / Dot */}
                        <View className="items-center me-3 mt-0.5">
                          <View
                            className={`h-5 w-5 rounded-full items-center justify-center ${
                              act.type === 'entry'
                                ? 'bg-emerald-500/10'
                                : act.type === 'exit'
                                ? 'bg-primary/10'
                                : 'bg-amber-500/10'
                            }`}
                          >
                            {act.type === 'entry' ? (
                              <LogIn size={11} className="text-emerald-600 dark:text-emerald-400" />
                            ) : act.type === 'exit' ? (
                              <LogOut size={11} className="text-primary" />
                            ) : (
                              <CheckCircle2 size={11} className="text-amber-600 dark:text-amber-400" />
                            )}
                          </View>
                          {!isLast && <View className="w-0.5 h-6 bg-border mt-1" />}
                        </View>

                        {/* Content */}
                        <View className="flex-1 pb-1">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs font-bold text-foreground">{act.title}</Text>
                            <Text className="text-[10px] text-muted-foreground">
                              {formatTime(act.timestamp)}
                            </Text>
                          </View>
                          <Text className="text-[11px] text-muted-foreground mt-0.5">
                            {act.subtitle}
                          </Text>
                          <Text className="text-[9px] text-muted-foreground/75 mt-0.5">
                            {formatDate(act.timestamp)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Row */}
        <View className="flex-row gap-3 mt-1">
          <Button variant="outline" className="flex-1" onPress={onClose}>
            Close
          </Button>
          {canManage && onEdit ? (
            <Button
              variant="default"
              className="flex-1"
              onPress={() => {
                onClose();
                onEdit();
              }}
            >
              <Edit3 size={15} className="text-primary-foreground me-1.5" />
              <Text className="text-sm font-semibold text-primary-foreground">Edit Profile</Text>
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default StaffDetailModal;
