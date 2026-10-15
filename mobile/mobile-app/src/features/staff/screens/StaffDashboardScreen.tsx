import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
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
import { useStaffDashboard } from '../hooks/useStaffDashboard';
import {
  LogOut,
  ClipboardList,
  ChevronRight,
  ShieldAlert,
  UserX,
  RotateCw,
  Info,
  QrCode,
  CalendarClock,
  CheckCircle2,
  Home,
  UserCheck,
} from 'lucide-react-native';

interface StaffDashboardScreenProps {
  embeddedMode?: boolean;
}

export const StaffDashboardScreen: React.FC<StaffDashboardScreenProps> = ({ embeddedMode = false }) => {
  const router = useRouter();
  const [showQrModal, setShowQrModal] = useState(false);
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
    showLogoutConfirm,
    refreshProfile,
    confirmLogout,
    cancelLogout,
    executeLogout,
  } = useStaffDashboard();

  const activeSession = myAttendanceRecords?.find((s) => s.status === 'Open');
  const recentAttendance = (myAttendanceRecords || []).slice(0, 3);

  const content = (
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 60 }}
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
                'This tab is the personal self-service portal for staff members to access their cryptographic gate QR pass, view shift logs, and manage resident household assignment requests.\n\nYour current logged-in account is an Administrator. To test or use this portal as a staff member, link your account to a staff profile in the Directory tab or sign in as a staff member.'
              }
              icon={UserCheck}
              actionLabel="Go to Staff Directory"
              onAction={() => router.push('/admin/staff')}
            />
          </View>
        ) : (
          /* 4. Verified Staff Self-Service View */
          <View>
            <StaffProfileCard
              member={myProfile}
              activeOrgId={activeOrgId}
            />

            {/* Quick Self-Service Actions */}
            {/* Household Requests (Pending Resident Invitations) */}
            {pendingAllocations.length > 0 && (
              <View className="mt-2 mb-4">
                <View className="flex-row items-center justify-between mb-2">
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
                  const unitLabel = `${alloc.villaId?.unitNumber || 'Unit'}${alloc.villaId?.blockOrBuilding ? ` (${alloc.villaId.blockOrBuilding})` : ''}`;
                  const requestedBy = alloc.associatedBy?.name || 'Resident';
                  return (
                    <View
                      key={alloc._id}
                      className="p-4 rounded-2xl bg-card border border-amber-500/30 mb-3 shadow-sm"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Home size={18} className="text-amber-600 dark:text-amber-400 me-2" />
                          <Text className="text-base font-bold text-foreground">
                            {unitLabel}
                          </Text>
                        </View>
                        <Text className="text-xs text-muted-foreground font-medium">
                          {alloc.roleOrTrade || 'Staff Duty'}
                        </Text>
                      </View>

                      <Text className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        Resident <Text className="font-semibold text-foreground">{requestedBy}</Text> has requested to assign you to their household.
                        {alloc.notes ? ` Note: "${alloc.notes}"` : ''}
                      </Text>

                      <View className="flex-row items-center gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 py-2"
                          onPress={() => handleRejectAllocation(alloc._id)}
                        >
                          <Text className="text-xs font-semibold text-destructive">Decline</Text>
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1 py-2"
                          onPress={() => handleAcceptAllocation(alloc._id)}
                        >
                          <Text className="text-xs font-bold text-white">Accept Invitation</Text>
                        </Button>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Allocated Houses (Active Associations) */}
            <View className="mt-2 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-foreground">
                  Allocated Houses ({activeAllocations.length})
                </Text>
              </View>

              {activeAllocations.length === 0 ? (
                <View className="p-4 rounded-2xl bg-card border border-border mb-3 items-center justify-center">
                  <Home size={22} className="text-muted-foreground/60 mb-1.5" />
                  <Text className="text-xs text-muted-foreground text-center">
                    No residential units currently allocated. When residents assign you to their unit and you accept, they will appear here.
                  </Text>
                </View>
              ) : (
                activeAllocations.slice(0, 3).map((alloc) => {
                  const unitLabel = `${alloc.villaId?.unitNumber || 'Unit'}${alloc.villaId?.blockOrBuilding ? ` (${alloc.villaId.blockOrBuilding})` : ''}`;
                  return (
                    <View
                      key={alloc._id}
                      className="flex-row items-center justify-between p-3.5 rounded-2xl bg-card border border-border mb-2.5 shadow-sm"
                    >
                      <View className="flex-row items-center flex-1 me-2">
                        <View className="h-10 w-10 rounded-xl bg-primary/10 items-center justify-center me-3">
                          <Home size={18} className="text-primary" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-foreground">
                            {unitLabel}
                          </Text>
                          <Text className="text-xs text-muted-foreground mt-0.5">
                            {alloc.roleOrTrade || 'Household Staff'} • {alloc.associatedBy?.name || 'Resident'}
                          </Text>
                        </View>
                      </View>
                      <View className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Authorized
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Quick Self-Service Actions */}
            <View className="mt-2 mb-4">
              <Text className="text-base font-bold text-foreground mb-3">
                Assigned Work & Duties
              </Text>

              {/* Digital Gate QR Pass Card */}
              <TouchableOpacity
                onPress={() => setShowQrModal(true)}
                className="flex-row items-center justify-between p-4 rounded-2xl bg-card border border-border mb-3 shadow-sm active:bg-muted/40"
                accessibilityRole="button"
                accessibilityLabel="View staff digital QR pass for gate attendance"
              >
                <View className="flex-row items-center flex-1 me-3">
                  <View className="h-11 w-11 rounded-xl bg-primary/10 items-center justify-center me-3">
                    <QrCode size={22} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">
                      Digital Gate QR Pass
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      Show at estate gates for entry & exit attendance
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} className="text-muted-foreground" />
              </TouchableOpacity>

              {/* Assignee Queue / Work Orders Card */}
              <TouchableOpacity
                onPress={() => router.push('/(resident)/complaints/assignee' as any)}
                className="flex-row items-center justify-between p-4 rounded-2xl bg-card border border-border mb-3 shadow-sm active:bg-muted/40"
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

            {/* Gate Attendance & On-Site Status */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-foreground">
                  Gate Attendance & History
                </Text>
                {activeSession ? (
                  <View className="flex-row items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 me-1.5" />
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Currently On-Site
                    </Text>
                  </View>
                ) : (
                  <View className="px-2.5 py-1 rounded-full bg-muted border border-border">
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Off-Site
                    </Text>
                  </View>
                )}
              </View>

              {/* Attendance Preview List (Max 3 Items) */}
              {isAttendanceLoading && recentAttendance.length === 0 ? (
                <SkeletonLoader count={2} />
              ) : recentAttendance.length === 0 ? (
                <View className="p-4 rounded-2xl bg-card border border-border items-center justify-center">
                  <CalendarClock size={24} className="text-muted-foreground/60 mb-2" />
                  <Text className="text-xs text-muted-foreground text-center">
                    No gate check-in or checkout activity recorded yet. Show your QR pass at the security gate to record attendance.
                  </Text>
                </View>
              ) : (
                recentAttendance.map((rec) => (
                  <StaffAttendanceCard key={rec._id} record={rec} />
                ))
              )}
            </View>

            {/* Access Boundary Notice */}
            <View className="p-4 rounded-2xl bg-muted/40 border border-border flex-row items-start">
              <Info size={16} className="text-muted-foreground me-2.5 mt-0.5" />
              <Text className="text-xs text-muted-foreground flex-1 leading-relaxed">
                Self-Service Portal: You are viewing your personal profile and assigned tasks. Community-wide registry management and resident administration are restricted to authorized administrators.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Staff QR Pass Bottom Sheet */}
      {myProfile ? (
        <StaffQrPassModal
          visible={showQrModal}
          onClose={() => setShowQrModal(false)}
          staffMember={myProfile}
        />
      ) : null}

      {/* Logout Confirmation Dialog */}
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your staff account?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={executeLogout}
        onCancel={cancelLogout}
        variant="danger"
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
      headerRight={
        <TouchableOpacity
          onPress={confirmLogout}
          className="p-2 rounded-xl bg-destructive/10 border border-destructive/20 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Sign out of staff portal"
        >
          <LogOut size={18} className="text-destructive" />
        </TouchableOpacity>
      }
    >
      {content}
    </ScreenShell>
  );
};

export default StaffDashboardScreen;
