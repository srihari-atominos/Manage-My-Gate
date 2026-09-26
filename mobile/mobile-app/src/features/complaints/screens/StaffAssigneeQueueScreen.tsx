import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { CheckCircle2, AlertCircle, Play, Pause, CheckSquare, XCircle, FileText, Send, Radio } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useComplaints } from '../hooks/useComplaints';
import { ComplaintCard } from '../components/ComplaintCard';
import { CompleteWorkSheet } from '../components/CompleteWorkSheet';
import { ComplaintDetailSheet } from '../components/ComplaintDetailSheet';
import { ComplaintFilterDrawer, ComplaintFilterValues } from '../components/ComplaintFilterDrawer';
import { TaskActionModal } from '../components/TaskActionModals';
import { selectAuthUser } from '../../auth/store/authSelectors';
import { Complaint } from '../types';

export function StaffAssigneeQueueScreen() {
  const routeParams = useLocalSearchParams<{ ticketId?: string }>();
  const ticketIdParam = routeParams?.ticketId ? String(routeParams.ticketId) : '';

  const currentUser = useSelector(selectAuthUser) as any;
  const currentUserId = String(currentUser?._id || currentUser?.id || currentUser?.userId || '');

  const {
    complaints,
    isLoading,
    error,
    fetchComplaints,
    acceptAssignment,
    rejectAssignment,
    startWork,
    pauseWork,
    resumeWork,
    markWorkCompleted,
    addComment,
    clearErrors,
  } = useComplaints();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'ON_HOLD' | 'BROADCAST'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState<ComplaintFilterValues>({
    status: 'ALL',
    priority: 'ALL',
    category: 'ALL',
  });

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [completingComplaint, setCompletingComplaint] = useState<Complaint | null>(null);

  // Modal Action State
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    type: 'REJECT' | 'PAUSE' | 'NOTES';
    complaint: Complaint | null;
  }>({
    visible: false,
    type: 'NOTES',
    complaint: null,
  });

  const loadData = useCallback(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (ticketIdParam && complaints.length > 0 && !selectedComplaint) {
      const target = complaints.find(
        (c: Complaint) =>
          c._id === ticketIdParam ||
          c.complaintNumber?.toLowerCase() === ticketIdParam.toLowerCase(),
      );
      if (target) {
        setSelectedComplaint(target);
      }
    }
  }, [ticketIdParam, complaints, selectedComplaint]);

  // Compute Web-aligned status counts & assigned technician filtering
  const metrics = useMemo(() => {
    const userRole = currentUser?.role || '';
    const userRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
    const isAdmin =
      userRoles.some((r: string) =>
        ['Admin', 'Community Admin', 'FacilityManager', 'Manager', 'Facility Manager'].includes(r),
      ) ||
      ['Admin', 'Community Admin', 'FacilityManager', 'Manager', 'Facility Manager'].includes(
        userRole,
      );
    const techId = String(currentUser?.technicianId || currentUser?.techId || '');
    const currentUserName = (
      currentUser?.name ||
      currentUser?.username ||
      `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim()
    ).toLowerCase();

    // Helper to check if a complaint matches the current technician/user
    const isUserAssignedOrBroadcast = (c: Complaint) => {
      // Exclude unassigned complaints / initial open states unless broadcast
      if (
        ['Submitted', 'Open', 'Waiting For Assignment'].includes(c.status) &&
        !c.assignedTechnicianId &&
        !c.assignedTechnicianName &&
        !c.isBroadcast
      ) {
        return false;
      }

      if (isAdmin) return true;
      if (!currentUserId && !techId) return false;

      const techIdStr =
        typeof c.assignedTechnicianId === 'object' && c.assignedTechnicianId !== null
          ? String(c.assignedTechnicianId._id || (c.assignedTechnicianId as any).id || '')
          : String(c.assignedTechnicianId || '');

      const isDirectMatch = Boolean(
        techIdStr && (techIdStr === currentUserId || (techId && techIdStr === techId)),
      );

      const assignedName = (c.assignedTechnicianName || '').toLowerCase();
      const isNameMatch = Boolean(
        assignedName && currentUserName && assignedName === currentUserName,
      );

      const isBroadcastMatch = Boolean(
        c.isBroadcast &&
          (c.status === 'Waiting For Acceptance' || c.status === 'Assigned') &&
          Array.isArray(c.broadcastTechnicianIds) &&
          c.broadcastTechnicianIds.some((id: any) => {
            const tid =
              typeof id === 'object' && id !== null
                ? String(id._id || id.id || '')
                : String(id || '');
            return Boolean(tid && (tid === currentUserId || (techId && tid === techId)));
          }),
      );

      return isDirectMatch || isNameMatch || isBroadcastMatch;
    };

    // Filter ALL tasks belonging to/assigned to this user or admin
    const allUserTasks = complaints.filter(isUserAssignedOrBroadcast);

    // Direct assigned tasks (non-broadcast or accepted broadcast)
    const assignedTasks = allUserTasks.filter((c: Complaint) => {
      if (c.isBroadcast && c.status === 'Waiting For Acceptance') return false;
      return true;
    });

    // Broadcast pool
    const broadcastPool = complaints.filter((c: Complaint) => {
      if (!c.isBroadcast || c.status !== 'Waiting For Acceptance') return false;
      if (isAdmin) return true;
      if (!currentUserId && !techId) return false;
      return (
        Array.isArray(c.broadcastTechnicianIds) &&
        c.broadcastTechnicianIds.some((id: any) => {
          const tid =
            typeof id === 'object' && id !== null
              ? String(id._id || id.id || '')
              : String(id || '');
          return Boolean(tid && (tid === currentUserId || (techId && tid === techId)));
        })
      );
    });

    const pendingAllocations = allUserTasks.filter(
      (c: Complaint) =>
        c.status === 'Assigned' || c.status === 'Waiting For Acceptance' || c.status === 'Accepted',
    );
    const inProgress = allUserTasks.filter((c: Complaint) => c.status === 'In Progress');
    const onHold = allUserTasks.filter((c: Complaint) => c.status === 'On Hold' || c.status === 'Paused');

    return {
      all: allUserTasks.length,
      pending: pendingAllocations.length,
      inProgress: inProgress.length,
      onHold: onHold.length,
      broadcast: broadcastPool.length,
      allUserTasks,
      assignedTasks,
      broadcastPool,
    };
  }, [complaints, currentUserId, currentUser]);

  // Filtered Task List Feed
  const filteredTasks = useMemo(() => {
    let source = selectedStatusTab === 'BROADCAST' ? metrics.broadcastPool : metrics.allUserTasks;

    return source.filter((ticket: Complaint) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = ticket.complaintNumber?.toLowerCase().includes(q);
        const matchesTitle = ticket.title?.toLowerCase().includes(q);
        const matchesCat = ticket.category?.toLowerCase().includes(q);
        if (!matchesNum && !matchesTitle && !matchesCat) return false;
      }

      // 2. Status Tab Filter
      if (selectedStatusTab === 'PENDING') {
        if (
          ticket.status !== 'Assigned' &&
          ticket.status !== 'Waiting For Acceptance' &&
          ticket.status !== 'Accepted'
        )
          return false;
      } else if (selectedStatusTab === 'IN_PROGRESS') {
        if (ticket.status !== 'In Progress') return false;
      } else if (selectedStatusTab === 'ON_HOLD') {
        if (ticket.status !== 'On Hold' && ticket.status !== 'Paused') return false;
      }

      // 3. Drawer Priority Filter
      if (drawerFilters.priority && drawerFilters.priority !== 'ALL') {
        if (ticket.priority?.toLowerCase() !== drawerFilters.priority.toLowerCase()) return false;
      }

      // 4. Drawer Category Filter
      if (drawerFilters.category && drawerFilters.category !== 'ALL') {
        if (ticket.category?.toLowerCase() !== drawerFilters.category.toLowerCase()) return false;
      }

      // 5. Drawer Status Filter
      if (drawerFilters.status && drawerFilters.status !== 'ALL') {
        if (ticket.status?.toLowerCase() !== drawerFilters.status.toLowerCase()) return false;
      }

      return true;
    });
  }, [metrics, searchQuery, selectedStatusTab, drawerFilters]);

  const activeDrawerCount =
    (drawerFilters.status !== 'ALL' && drawerFilters.status ? 1 : 0) +
    (drawerFilters.priority !== 'ALL' && drawerFilters.priority ? 1 : 0) +
    (drawerFilters.category !== 'ALL' && drawerFilters.category ? 1 : 0);

  const handleAcceptAssignment = async (id: string) => {
    try {
      await acceptAssignment(id);
      loadData();
    } catch (err: any) {
      Alert.alert('Acceptance Error', err?.message || 'Failed to accept assignment');
    }
  };

  const handleStartWork = async (id: string) => {
    try {
      await startWork(id);
      loadData();
    } catch (err: any) {
      Alert.alert('Start Error', err?.message || 'Failed to start work');
    }
  };

  const handleResumeWork = async (id: string) => {
    try {
      await resumeWork(id);
      loadData();
    } catch (err: any) {
      Alert.alert('Resume Error', err?.message || 'Failed to resume work');
    }
  };

  const handleModalSubmit = async (id: string, text: string) => {
    if (actionModal.type === 'REJECT') {
      await rejectAssignment(id, text || 'Decline assignment');
    } else if (actionModal.type === 'PAUSE') {
      await pauseWork(id, text || 'Paused work');
    } else if (actionModal.type === 'NOTES') {
      await addComment(id, text);
    }
    loadData();
  };

  return (
    <ScreenShell
      title="Assignee Task Console"
      subtitle="Technician work order & task execution portal"
      iconName="ClipboardList"
      loading={isLoading && complaints.length === 0}
    >
      <View className="flex-1 bg-background">
        {error ? (
          <View className="px-4 pt-3">
            <ErrorBanner message={error} onDismiss={clearErrors} />
          </View>
        ) : null}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#6366f1" />}
        >
          {/* ALLOCATED WORK NOTIFICATION BANNER (MATCHES WEB Assignee.jsx) */}
          {metrics.pending > 0 && (
            <View className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex-row items-center">
              <Icon as={AlertCircle} size={18} color="#2563eb" style={{ marginRight: 10 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-blue-900">Admin Allocated Work</Text>
                <Text className="text-[11px] text-blue-700">
                  You have {metrics.pending} new pending assignment{metrics.pending > 1 ? 's' : ''} awaiting action.
                </Text>
              </View>
            </View>
          )}

          {/* CANONICAL SEARCH FILTER BAR WITH MOVEABLE STATUS SLIDE PILLS */}
          <View className="px-4 pt-3 pb-1">
            <SearchFilterBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by ticket #, title, category..."
              onFilterPress={() => setIsFilterOpen(true)}
              activeFilterCount={activeDrawerCount}
              sortOptions={[
                { label: `All Tasks (${metrics.all})`, value: 'ALL' },
                { label: `Pending (${metrics.pending})`, value: 'PENDING' },
                { label: `In Progress (${metrics.inProgress})`, value: 'IN_PROGRESS' },
                { label: `On Hold (${metrics.onHold})`, value: 'ON_HOLD' },
                { label: `Broadcast (${metrics.broadcast})`, value: 'BROADCAST' },
              ]}
              currentSort={selectedStatusTab}
              onSortChange={(val) => setSelectedStatusTab(val as any)}
              variant="default"
              className="px-0 py-0 border-0"
            />
          </View>

          {/* TECHNICIAN TASK LIST FEED */}
          <View className="px-4 pt-1 gap-3">
            {filteredTasks.length === 0 ? (
              <View className="pt-6">
                <EmptyState
                  icon={CheckCircle2}
                  title="Task Queue Clear"
                  description={
                    selectedStatusTab === 'BROADCAST'
                      ? 'There are no open broadcast requests in the pool right now.'
                      : 'You currently have no active work assignments under this filter.'
                  }
                />
              </View>
            ) : (
              filteredTasks.map((ticket: Complaint) => {
                const isPendingAccept = ticket.status === 'Assigned' || ticket.status === 'Waiting For Acceptance';
                const isInProgress = ticket.status === 'In Progress';
                const isOnHold = ticket.status === 'On Hold' || ticket.status === 'Paused';

                const renderCardActions = () => (
                  <>
                    {/* BROADCAST / PENDING ALLOCATION ACTIONS */}
                    {(selectedStatusTab === 'BROADCAST' || isPendingAccept) && (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            setActionModal({ visible: true, type: 'REJECT', complaint: ticket });
                          }}
                          style={{
                            backgroundColor: '#fef2f2',
                            borderColor: '#fecdd3',
                            borderWidth: 1,
                            paddingVertical: 6,
                            paddingHorizontal: 11,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Icon as={XCircle} size={13} color="#e11d48" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#e11d48', fontWeight: 'bold', fontSize: 11 }}>
                            {selectedStatusTab === 'BROADCAST' ? 'Decline' : 'Reject'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            handleAcceptAssignment(ticket._id);
                          }}
                          style={{
                            backgroundColor: '#2563eb', // solid blue
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Icon as={Send} size={13} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>Accept Job</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* ASSIGNED READY TO START */}
                    {ticket.status === 'Accepted' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          handleStartWork(ticket._id);
                        }}
                        style={{
                          backgroundColor: '#059669', // solid green
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <Icon as={Play} size={13} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>Start Work</Text>
                      </TouchableOpacity>
                    )}

                    {/* IN PROGRESS ACTIONS */}
                    {isInProgress && (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            setActionModal({ visible: true, type: 'PAUSE', complaint: ticket });
                          }}
                          style={{
                            backgroundColor: '#fffbeb',
                            borderColor: '#fde68a',
                            borderWidth: 1,
                            paddingVertical: 6,
                            paddingHorizontal: 9,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Icon as={Pause} size={12} color="#d97706" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#d97706', fontWeight: 'bold', fontSize: 11 }}>Pause</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            setActionModal({ visible: true, type: 'NOTES', complaint: ticket });
                          }}
                          style={{
                            backgroundColor: '#f8fafc',
                            borderColor: '#cbd5e1',
                            borderWidth: 1,
                            paddingVertical: 6,
                            paddingHorizontal: 9,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Icon as={FileText} size={12} color="#475569" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#475569', fontWeight: 'bold', fontSize: 11 }}>Notes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            setCompletingComplaint(ticket);
                          }}
                          style={{
                            backgroundColor: '#059669', // solid green
                            paddingVertical: 6,
                            paddingHorizontal: 11,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Icon as={CheckSquare} size={13} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>Complete</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* ON HOLD / PAUSED RESUME ACTION */}
                    {isOnHold && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          handleResumeWork(ticket._id);
                        }}
                        style={{
                          backgroundColor: '#2563eb', // solid blue
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <Icon as={Play} size={13} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>Resume Work</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );

                return (
                  <ComplaintCard
                    key={ticket._id}
                    complaint={ticket}
                    onPress={() => setSelectedComplaint(ticket)}
                    actionButtons={renderCardActions()}
                  />
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Complete Work Sheet */}
        <CompleteWorkSheet
          visible={!!completingComplaint}
          complaint={completingComplaint}
          onClose={() => setCompletingComplaint(null)}
          onComplete={async (id, data) => {
            await markWorkCompleted(id, data);
            loadData();
          }}
        />

        {/* Task Action Modal (Reject / Pause / Notes) */}
        <TaskActionModal
          visible={actionModal.visible}
          type={actionModal.type}
          complaint={actionModal.complaint}
          onClose={() => setActionModal({ visible: false, type: 'NOTES', complaint: null })}
          onSubmit={handleModalSubmit}
        />

        {/* Detail Sheet */}
        <ComplaintDetailSheet
          visible={!!selectedComplaint}
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          viewMode="assignee"
          onAcceptAssignment={handleAcceptAssignment}
          onRejectPress={(ticket) => {
            setSelectedComplaint(null);
            setActionModal({ visible: true, type: 'REJECT', complaint: ticket });
          }}
          onStartWork={handleStartWork}
          onPauseWorkPress={(ticket) => setActionModal({ visible: true, type: 'PAUSE', complaint: ticket })}
          onResumeWork={handleResumeWork}
          onCompleteWorkPress={(ticket) => setCompletingComplaint(ticket)}
        />

        {/* COMPLAINT FILTER DRAWER */}
        <ComplaintFilterDrawer
          visible={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={drawerFilters}
          onApply={setDrawerFilters}
          onReset={() =>
            setDrawerFilters({
              status: 'ALL',
              priority: 'ALL',
              category: 'ALL',
            })
          }
        />
      </View>
    </ScreenShell>
  );
}

export default StaffAssigneeQueueScreen;
