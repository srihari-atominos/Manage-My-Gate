import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { StaffProfileCard } from '../components/StaffProfileCard';
import { StaffQrPassModal } from '../components/StaffQrPassModal';
import { StaffAttendanceCard } from '../components/StaffAttendanceCard';
import { StaffMemberAttendanceModal } from '../components/StaffMemberAttendanceModal';
import { useStaffDashboard } from '../hooks/useStaffDashboard';
import {
  ClipboardList,
  ChevronRight,
  ShieldAlert,
  CalendarClock,
  CheckCircle2,
  Home,
  UserCheck,
  Check,
  X,
  History,
} from 'lucide-react-native';

interface StaffDashboardScreenProps {
  embeddedMode?: boolean;
  onSwitchToDirectory?: () => void;
}

export const StaffDashboardScreen: React.FC<StaffDashboardScreenProps> = ({
  embeddedMode = false,
  onSwitchToDirectory,
}) => {
  const router = useRouter();
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAttendanceHistoryModal, setShowAttendanceHistoryModal] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [rejectingAllocationId, setRejectingAllocationId] = useState<string | null>(null);

  const {
    myProfile,
    isLoading,
    error,
    activeOrgId,
    hasStaffAccess,
    activeAllocations,
    pendingAllocations,
    handleAcceptAllocation,
    handleRejectAllocation,
    myAttendanceRecords,
    isAttendanceLoading,
    refreshProfile,
    canViewWorkOrders,
    canViewAttendance,
    canViewAllocations,
  } = useStaffDashboard();

  const activeSession = myAttendanceRecords?.find((s) => s.status === 'Open');
  const recentAttendance = (myAttendanceRecords || []).slice(0, 3);

  const handleNavigateToDirectory = () => {
    if (onSwitchToDirectory) {
      onSwitchToDirectory();
    } else {
      router.push('/admin/staff');
    }
  };

  const onAcceptPress = async (allocId: string) => {
    try {
      setActionInProgressId(allocId);
      await handleAcceptAllocation(allocId);
      Alert.alert('Assignment Accepted', 'You have successfully accepted the unit allocation.');
      refreshProfile();
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Could not accept the assignment. Please try again.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const onConfirmReject = async () => {
    if (!rejectingAllocationId) return;
    try {
      setActionInProgressId(rejectingAllocationId);
      await handleRejectAllocation(rejectingAllocationId, 'Declined by staff member');
      Alert.alert('Assignment Declined', 'The household allocation request has been rejected.');
      refreshProfile();
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Could not decline the assignment. Please try again.');
    } finally {
      setActionInProgressId(null);
      setRejectingAllocationId(null);
    }
  };

  const content = (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-32"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshProfile}
            tintColor="#2563EB"
          />
        }
      >
        {/* 1. Unauthorized Access Guard */}
        {!hasStaffAccess ? (
          <EmptyState
            title="Access Restricted"
            description="Your user account does not have staff self-service permissions. Please contact your Community Administrator to assign staff authorization."
            icon={ShieldAlert}
          />
        ) : isLoading && !myProfile ? (
          /* 2. Loading Skeleton */
          <View className="py-4">
            <SkeletonLoader count={4} />
          </View>
        ) : !myProfile ? (
          /* 3. Unlinked / Missing Staff Profile */
          <View className="py-6">
            <EmptyState
              title="Staff Portal & Digital Pass"
              description={
                'You are currently logged in as an Administrator/Resident.\n\nThis portal displays personal staff QR attendance passes, assigned work orders, and household assignment requests when your account is registered as a staff member.\n\nTo manage staff members or register yourself as staff, visit the Staff Directory.'
              }
              icon={UserCheck}
            />
          </View>
        ) : (
          /* 4. Staff Experience (Portal & Pass vs Staff Dual) */
          <View className="gap-4">
            {/* Staff Profile Card */}
            <StaffProfileCard member={myProfile} activeOrgId={activeOrgId} onOpenQrPass={() => setShowQrModal(true)} />

            {/* Quick metrics only include allocations where this staff member may work in units. */}
            {canViewAttendance ? (
              <View className="flex-row gap-2">
                {canViewAllocations ? (
                  <>
                    <View className="flex-1 py-2.5 px-2 rounded-2xl bg-card border border-border items-center justify-center">
                      <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>Allocated Units</Text>
                      <Text className="text-sm font-bold text-foreground mt-0.5">{activeAllocations.length}</Text>
                    </View>
                    <View className="flex-1 py-2.5 px-2 rounded-2xl bg-card border border-border items-center justify-center">
                      <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>Pending Invites</Text>
                      <Text className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{pendingAllocations.length}</Text>
                    </View>
                  </>
                ) : null}
                <View className="flex-1 py-2.5 px-2 rounded-2xl bg-card border border-border items-center justify-center">
                  <Text className="text-[11px] font-medium text-muted-foreground text-center" numberOfLines={1}>Gate Status</Text>
                  <Text className={`text-sm font-bold mt-0.5 ${activeSession ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {activeSession ? 'On-Site' : 'Off-Site'}
                  </Text>
                </View>
              </View>
            ) : null}
            {/* A. Pending Household Assignment Requests (Dual / Allocations permission only) */}
            {canViewAllocations && pendingAllocations.length > 0 && (
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-foreground">
                    Household Allocation Requests ({pendingAllocations.length})
                  </Text>
                  <View className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      Pending Action
                    </Text>
                  </View>
                </View>

                {pendingAllocations.map((alloc) => {
                  const unitLabel = `${alloc.villaId?.unitNumber || 'Unit'}${
                    alloc.villaId?.blockOrBuilding ? ` (${alloc.villaId.blockOrBuilding})` : ''
                  }`;
                  const requestedBy = alloc.associatedBy?.name || 'Resident';
                  const isBusy = actionInProgressId === alloc._id;

                  return (
                    <View
                      key={alloc._id}
                      className="p-4 rounded-2xl bg-card border border-amber-500/40 shadow-xs"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 me-2">
                          <View className="h-9 w-9 rounded-xl bg-amber-500/10 items-center justify-center me-2.5">
                            <Home size={18} className="text-amber-600 dark:text-amber-400" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                              {unitLabel}
                            </Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                              {alloc.roleOrTrade || 'Staff Duty'}
                            </Text>
                          </View>
                        </View>
                        <View className="px-2 py-0.5 rounded-full bg-amber-500/10">
                          <Text className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            Awaiting Response
                          </Text>
                        </View>
                      </View>

                      <Text className="text-xs text-muted-foreground mb-2 leading-relaxed">
                        Resident <Text className="font-semibold text-foreground">{requestedBy}</Text> has invited you to assist their household.
                        {alloc.notes ? ` Note: "${alloc.notes}"` : ''}
                      </Text>

                      {/* Schedule info if specified */}
                      {alloc.accessSchedule?.timeWindow?.start && alloc.accessSchedule?.timeWindow?.end ? (
                        <View className="flex-row items-center gap-1.5 mb-3 bg-muted/50 px-2.5 py-1.5 rounded-xl border border-border/60">
                          <CalendarClock size={13} className="text-primary shrink-0" />
                          <Text className="text-[11px] font-semibold text-foreground">
                            {alloc.accessSchedule.timeWindow.start} - {alloc.accessSchedule.timeWindow.end}
                            {alloc.accessSchedule.days && alloc.accessSchedule.days.length > 0
                              ? ` â€¢ ${alloc.accessSchedule.days.join(', ')}`
                              : ''}
                          </Text>
                        </View>
                      ) : null}

                      {/* Visible Action Row */}
                      <View className="flex-row items-center gap-2 pt-1 border-t border-border/50">
                        <Button
                          variant="outline"
                          className="flex-1 h-10 border-destructive/30 active:bg-destructive/10 flex-row items-center justify-center gap-1.5"
                          onPress={() => setRejectingAllocationId(alloc._id)}
                          disabled={isBusy}
                          accessibilityLabel={`Decline allocation for ${unitLabel}`}
                        >
                          <X size={15} className="text-destructive" />
                          <Text className="text-xs font-semibold text-destructive">Decline</Text>
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1 h-10 flex-row items-center justify-center gap-1.5"
                          onPress={() => onAcceptPress(alloc._id)}
                          disabled={isBusy}
                          accessibilityLabel={`Accept allocation for ${unitLabel}`}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Check size={15} className="text-primary-foreground" />
                              <Text className="text-xs font-bold text-primary-foreground">Accept</Text>
                            </>
                          )}
                        </Button>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* B. Allocated Units Section (Dual / Allocations permission only) */}
            {canViewAllocations && (
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-foreground">
                    Allocated Units ({activeAllocations.length})
                  </Text>
                  {activeAllocations.length > 0 && (
                    <Text className="text-xs text-muted-foreground">
                      Active Household Access
                    </Text>
                  )}
                </View>

                {activeAllocations.length === 0 ? (
                  <View className="p-4 rounded-2xl bg-card border border-border items-center justify-center">
                    <Home size={22} className="text-muted-foreground/60 mb-1.5" />
                    <Text className="text-xs text-muted-foreground text-center">
                      No residential units currently allocated. Accepted household invitations will appear here.
                    </Text>
                  </View>
                ) : (
                  activeAllocations.map((alloc) => {
                    const unitLabel = `${alloc.villaId?.unitNumber || 'Unit'}${
                      alloc.villaId?.blockOrBuilding ? ` (${alloc.villaId.blockOrBuilding})` : ''
                    }`;
                    return (
                      <View
                        key={alloc._id}
                        className="flex-row items-center justify-between p-3.5 rounded-2xl bg-card border border-border shadow-xs"
                      >
                        <View className="flex-row items-center flex-1 me-2">
                          <View className="h-10 w-10 rounded-xl bg-primary/10 items-center justify-center me-3">
                            <Home size={18} className="text-primary" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                              {unitLabel}
                            </Text>
                            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                              {alloc.roleOrTrade || 'Household Staff'} â€¢ {alloc.associatedBy?.name || 'Resident'}
                            </Text>
                            {alloc.accessSchedule?.timeWindow?.start && alloc.accessSchedule?.timeWindow?.end ? (
                              <Text className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {alloc.accessSchedule.timeWindow.start} - {alloc.accessSchedule.timeWindow.end}
                                {alloc.accessSchedule.days && alloc.accessSchedule.days.length > 0
                                  ? ` (${alloc.accessSchedule.days.join(', ')})`
                                  : ''}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Active
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* C. Assigned Work Orders (Dual / Work Orders permission only) */}
            {canViewWorkOrders && (
              <View className="gap-2.5">
                <Text className="text-base font-bold text-foreground">
                  Work Orders & Tickets
                </Text>

                <TouchableOpacity
                  onPress={() => router.push('/(resident)/complaints/assignee' as any)}
                  className="flex-row items-center justify-between p-4 rounded-2xl bg-card border border-border shadow-xs active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="View assigned work orders"
                >
                  <View className="flex-row items-center flex-1 me-3">
                    <View className="h-11 w-11 rounded-xl bg-primary/10 items-center justify-center me-3">
                      <ClipboardList size={22} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-foreground">
                        Assigned Work Orders
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        Review, accept, and update assigned tickets
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </TouchableOpacity>
              </View>
            )}

            {/* D. Gate Attendance & History (Dual / Attendance permission only) */}
            {canViewAttendance && (
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-foreground">
                    Gate Attendance
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {activeSession ? (
                      <View className="flex-row items-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 me-1" />
                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          On-Site
                        </Text>
                      </View>
                    ) : (
                      <View className="px-2.5 py-0.5 rounded-full bg-muted border border-border">
                        <Text className="text-xs font-semibold text-muted-foreground">
                          Off-Site
                        </Text>
                      </View>
                    )}

                  {myAttendanceRecords && myAttendanceRecords.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowAttendanceHistoryModal(true)}
                      className="flex-row items-center px-2 py-0.5 rounded-lg active:bg-muted"
                      accessibilityRole="button"
                      accessibilityLabel="View all attendance records"
                    >
                      <History size={13} className="text-primary me-1" />
                      <Text className="text-xs font-semibold text-primary">All ({myAttendanceRecords.length})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Attendance Preview List (Strict Max 3 Items) */}
              {isAttendanceLoading && recentAttendance.length === 0 ? (
                <SkeletonLoader count={2} />
              ) : recentAttendance.length === 0 ? (
                <View className="p-4 rounded-2xl bg-card border border-border items-center justify-center">
                  <CalendarClock size={22} className="text-muted-foreground/60 mb-1.5" />
                  <Text className="text-xs text-muted-foreground text-center">
                    No gate check-in or checkout activity recorded yet. Show your QR pass at the security gate to record attendance.
                  </Text>
                </View>
              ) : (
                recentAttendance.map((rec) => (
                  <StaffAttendanceCard key={rec._id} record={rec} hideStaffHeader={true} />
                ))
              )}
            </View>
          )}
          </View>
        )}
      </ScrollView>

      {/* Staff QR Pass Modal */}
      {myProfile ? (
        <StaffQrPassModal
          visible={showQrModal}
          onClose={() => setShowQrModal(false)}
          staffMember={myProfile}
        />
      ) : null}

      {/* Staff Attendance History Dossier Modal */}
      {myProfile ? (
        <StaffMemberAttendanceModal
          visible={showAttendanceHistoryModal}
          onClose={() => setShowAttendanceHistoryModal(false)}
          staffName={myProfile.name || 'Staff Member'}
          department={myProfile.department}
          records={myAttendanceRecords || []}
        />
      ) : null}

      {/* Decline Assignment Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(rejectingAllocationId)}
        title="Decline Household Allocation"
        message="Are you sure you want to decline this resident household allocation request?"
        confirmLabel="Decline"
        cancelLabel="Keep Pending"
        onConfirm={onConfirmReject}
        onCancel={() => setRejectingAllocationId(null)}
        variant="danger"
        loading={Boolean(actionInProgressId)}
      />

    </View>
  );

  if (embeddedMode) {
    return content;
  }

  return (
    <ScreenShell
      title="Staff Dashboard"
      subtitle="Personal Self-Service Portal"
      showBackButton={true}
    >
      {content}
    </ScreenShell>
  );
};

export default StaffDashboardScreen;



