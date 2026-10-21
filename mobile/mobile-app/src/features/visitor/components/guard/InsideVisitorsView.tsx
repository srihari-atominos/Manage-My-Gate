import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { selectActiveOrgId } from '@/src/features/auth/store/authSelectors';
import { useVisitorPass } from '../../hooks/useVisitorPass';
import { ActiveVisitorLog } from '../../store/visitorPassSlice';
import staffService, { StaffAttendanceRecord } from '@/src/features/staff/services/staffService';
import { LogOut, Users, UserCheck, HardHat } from 'lucide-react-native';

export const InsideVisitorsView: React.FC = () => {
  const activeOrgId = useSelector(selectActiveOrgId);
  const {
    activeVisitors,
    activeVisitorsStatus,
    fetchActiveVisitors,
    checkoutVisitor,
  } = useVisitorPass();

  const [activeCategory, setActiveCategory] = useState<'VISITORS' | 'STAFF'>('VISITORS');
  const [activeStaff, setActiveStaff] = useState<StaffAttendanceRecord[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedStaffSessionId, setSelectedStaffSessionId] = useState<string | null>(null);
  const [staffCheckoutError, setStaffCheckoutError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!activeOrgId) return;
    await fetchActiveVisitors(activeOrgId);
  }, [activeOrgId, fetchActiveVisitors]);

  const fetchStaffLogs = useCallback(async () => {
    try {
      setStaffLoading(true);
      const sessions = await staffService.getActiveAttendanceSessions();
      setActiveStaff(sessions);
    } catch (err: any) {
      console.warn('[InsideVisitorsView] Failed to fetch staff sessions:', err);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStaffLogs();
  }, [fetchLogs, fetchStaffLogs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchLogs(), fetchStaffLogs()]);
    setRefreshing(false);
  }, [fetchLogs, fetchStaffLogs]);

  const handleConfirmCheckout = async () => {
    if (selectedLogId) {
      try {
        await checkoutVisitor(selectedLogId);
        setCheckoutError(null);
      } catch (err: any) {
        // e.g. already checked out at another gate: tell the guard and refresh the list.
        setCheckoutError(err?.message || 'Failed to check out visitor.');
        fetchLogs();
      } finally {
        setSelectedLogId(null);
      }
    }
  };

  const handleConfirmStaffCheckout = async () => {
    if (selectedStaffSessionId) {
      try {
        await staffService.checkoutStaffSession(selectedStaffSessionId, { gateId: 'Main Gate' });
        setStaffCheckoutError(null);
        await fetchStaffLogs();
      } catch (err: any) {
        setStaffCheckoutError(err?.message || 'Failed to check out staff member.');
        await fetchStaffLogs();
      } finally {
        setSelectedStaffSessionId(null);
      }
    }
  };

  const renderHeader = () => (
    <>
      {checkoutError ? (
        <ErrorBanner message={checkoutError} onDismiss={() => setCheckoutError(null)} className="mb-3" />
      ) : null}
      {staffCheckoutError ? (
        <ErrorBanner message={staffCheckoutError} onDismiss={() => setStaffCheckoutError(null)} className="mb-3" />
      ) : null}

      {/* Category Segment Filter (Visitors vs Staff) */}
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={() => setActiveCategory('VISITORS')}
          className={`flex-1 py-2 px-3 rounded-xl border flex-row items-center justify-center gap-2 ${
            activeCategory === 'VISITORS'
              ? 'bg-primary border-primary'
              : 'bg-card border-border'
          }`}
          accessibilityRole="button"
          accessibilityLabel="View Visitors Inside"
        >
          <Users size={15} color={activeCategory === 'VISITORS' ? '#FFFFFF' : '#64748b'} />
          <Text
            className={`text-xs font-bold ${
              activeCategory === 'VISITORS' ? 'text-primary-foreground' : 'text-foreground'
            }`}
          >
            Visitors ({activeVisitors.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setActiveCategory('STAFF');
            fetchStaffLogs();
          }}
          className={`flex-1 py-2 px-3 rounded-xl border flex-row items-center justify-center gap-2 ${
            activeCategory === 'STAFF'
              ? 'bg-primary border-primary'
              : 'bg-card border-border'
          }`}
          accessibilityRole="button"
          accessibilityLabel="View Staff On Duty"
        >
          <HardHat size={15} color={activeCategory === 'STAFF' ? '#FFFFFF' : '#64748b'} />
          <Text
            className={`text-xs font-bold ${
              activeCategory === 'STAFF' ? 'text-primary-foreground' : 'text-foreground'
            }`}
          >
            Staff On-Duty ({activeStaff.length})
          </Text>
        </Pressable>
      </View>

      {/* Active Count Banner */}
      <View className="flex-row items-center justify-between bg-card border border-border rounded-2xl p-3.5 mb-3">
        <View className="flex-row items-center gap-2">
          {activeCategory === 'VISITORS' ? (
            <Users size={18} className="text-status-success" />
          ) : (
            <UserCheck size={18} className="text-emerald-500" />
          )}
          <Text className="text-sm font-bold text-foreground">
            {activeCategory === 'VISITORS' ? 'Active Visitors Inside' : 'Active Staff Inside'}
          </Text>
        </View>
        <Text className="text-xs font-extrabold text-status-success bg-status-success/15 px-3 py-1 rounded-full">
          {activeCategory === 'VISITORS' ? `${activeVisitors.length} On-Premises` : `${activeStaff.length} On-Duty`}
        </Text>
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-background">
      {activeCategory === 'VISITORS' ? (
        <PaginatedList<ActiveVisitorLog>
          data={activeVisitors}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: activeVisitors.length,
            limit: 50,
          }}
          onLoadMore={handleRefresh}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          loading={activeVisitorsStatus === 'loading' && !refreshing && activeVisitors.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="ShieldCheck"
          emptyTitle="No Active Visitors Inside"
          emptySubtitle="All entered visitors have been checked out at the security gate."
          contentContainerClassName="px-4 pt-3 pb-28 gap-3"
          renderItem={(log) => {
            if (!log) return null;

            const villaInfo = log.passId?.villaId || log.residentId?.villaId;
            const villaUnit = villaInfo?.unitNumber || villaInfo?.villaNumber || '';
            const villaBlock = villaInfo?.blockOrBuilding || villaInfo?.block ? ` (${villaInfo.blockOrBuilding || villaInfo.block})` : '';
            const villaText = villaUnit ? `Villa ${villaUnit}${villaBlock}` : 'Community Premises';

            const hostName = log.residentId?.name || log.residentId?.username || 'Host Resident';
            const vehiclePlate = log.snapshot?.vehicleNumber || log.passId?.vehicleDetails?.number || '';
            const passType = log.passId?.passType || log.entryType || 'VISITOR';
            const inTime = log.checkInTime
              ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently';

            const subtitle = `📍 ${villaText} • Host: ${hostName}\n⏰ In: ${inTime}${vehiclePlate ? ` • 🚗 ${vehiclePlate}` : ''} • ${passType}`;

            return (
              <ListCard
                title={log.snapshot?.visitorName || log.visitorName || 'Visitor'}
                subtitle={subtitle}
                leftIcon="ShieldCheck"
                leftIconBgColor="bg-status-success/15"
                status={{ label: 'INSIDE', variant: 'success' }}
                rightContent={
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setSelectedLogId(log._id)}
                    className="flex-row items-center gap-1 h-8 px-2.5 rounded-xl border-status-success/30 bg-status-success/10"
                    accessibilityLabel="Check Out Visitor"
                  >
                    <LogOut size={13} className="text-status-success" />
                    <Text className="text-xs font-bold text-status-success">Check Out</Text>
                  </Button>
                }
              />
            );
          }}
        />
      ) : (
        <PaginatedList<StaffAttendanceRecord>
          data={activeStaff}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: activeStaff.length,
            limit: 50,
          }}
          onLoadMore={handleRefresh}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          loading={staffLoading && !refreshing && activeStaff.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="HardHat"
          emptyTitle="No Staff Currently Inside"
          emptySubtitle="All checked-in staff members have checked out at the security gate."
          contentContainerClassName="px-4 pt-3 pb-28 gap-3"
          renderItem={(session) => {
            if (!session) return null;

            const tech = typeof session.technicianId === 'object' && session.technicianId !== null
              ? (session.technicianId as any)
              : null;
            const staffName = tech?.name || tech?.username || session.staffCode || 'Staff Member';
            const staffDept = tech?.department || tech?.designation || 'Community Staff';
            const staffCode = tech?.staffCode || session.staffCode || '';
            const inTime = session.checkInTime
              ? new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently';
            const gate = session.checkInGate || 'Main Gate';

            const subtitle = `📍 ${staffDept}${staffCode ? ` • Code: ${staffCode}` : ''}\n⏰ In: ${inTime} • Gate: ${gate}`;

            return (
              <ListCard
                title={staffName}
                subtitle={subtitle}
                leftIcon="HardHat"
                leftIconBgColor="bg-emerald-500/15"
                status={{ label: 'ON-SITE', variant: 'success' }}
                rightContent={
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setSelectedStaffSessionId(session._id)}
                    className="flex-row items-center gap-1 h-8 px-2.5 rounded-xl border-emerald-500/30 bg-emerald-500/10"
                    accessibilityLabel="Check Out Staff"
                  >
                    <LogOut size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Check Out</Text>
                  </Button>
                }
              />
            );
          }}
        />
      )}

      {/* Confirmation Modal for Visitor Checkout */}
      <ConfirmationModal
        visible={Boolean(selectedLogId)}
        title="Check Out Visitor?"
        message="Are you sure you want to mark this visitor as checked out at the gate desk?"
        variant="info"
        confirmLabel="Confirm Check-Out"
        onConfirm={handleConfirmCheckout}
        onCancel={() => setSelectedLogId(null)}
      />

      {/* Confirmation Modal for Staff Checkout */}
      <ConfirmationModal
        visible={Boolean(selectedStaffSessionId)}
        title="Check Out Staff Member?"
        message="Are you sure you want to mark this staff member as checked out at the security gate?"
        variant="info"
        confirmLabel="Confirm Staff Check-Out"
        onConfirm={handleConfirmStaffCheckout}
        onCancel={() => setSelectedStaffSessionId(null)}
      />
    </View>
  );
};

export default InsideVisitorsView;
