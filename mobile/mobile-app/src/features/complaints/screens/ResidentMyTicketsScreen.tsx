import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { CheckCircle2 } from 'lucide-react-native';
import { useComplaints } from '../hooks/useComplaints';
import { ComplaintCard } from '../components/ComplaintCard';
import { ComplaintDetailSheet } from '../components/ComplaintDetailSheet';
import { Complaint } from '../types';

export function ResidentMyTicketsScreen() {
  const {
    complaints,
    isLoading,
    error,
    fetchComplaints,
    addComment,
    confirmCompletion,
    updateStatus,
    clearErrors
  } = useComplaints();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Cancellation Confirmation Modal State
  const [cancelTicketId, setCancelTicketId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculated Metrics for Filter Counts
  const metrics = useMemo(() => {
    const total = complaints.length;
    const inProgress = complaints.filter((c: any) =>
      ['Assigned', 'In Progress', 'Accepted'].includes(c.status)
    ).length;
    const actionNeeded = complaints.filter((c: any) =>
      ['Work Completed', 'Waiting For Resident Confirmation'].includes(c.status)
    ).length;
    const resolved = complaints.filter((c: any) =>
      ['Closed', 'Completed'].includes(c.status)
    ).length;

    return { total, inProgress, actionNeeded, resolved };
  }, [complaints]);

  // Filtered List based on Search Query & Tab Filter
  const filteredTickets = useMemo(() => {
    return complaints.filter((item: Complaint) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = item.complaintNumber?.toLowerCase().includes(query);
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesCat = item.category?.toLowerCase().includes(query);
        if (!matchesNumber && !matchesTitle && !matchesCat) return false;
      }

      // 2. Tab Filter
      if (selectedStatusTab === 'OPEN') {
        return ['Submitted', 'Open', 'Waiting For Assignment'].includes(item.status);
      }
      if (selectedStatusTab === 'IN_PROGRESS') {
        return ['Assigned', 'In Progress', 'Accepted'].includes(item.status);
      }
      if (selectedStatusTab === 'ACTION_NEEDED') {
        return ['Work Completed', 'Waiting For Resident Confirmation'].includes(item.status);
      }
      if (selectedStatusTab === 'COMPLETED') {
        return ['Closed', 'Completed'].includes(item.status);
      }

      return true;
    });
  }, [complaints, searchQuery, selectedStatusTab]);

  const handleConfirmCancelTicket = async () => {
    if (!cancelTicketId) return;
    try {
      await updateStatus(cancelTicketId, {
        status: 'Cancelled',
        remarks: 'Cancelled by resident',
      });
      setCancelTicketId(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to cancel ticket:', err);
      Alert.alert('Error', err?.message || 'Failed to cancel ticket');
    }
  };

  const handleReopenTicket = async (id: string, remarks: string) => {
    try {
      await updateStatus(id, {
        status: 'Reopened',
        remarks: remarks || 'Reopened by resident due to persistent issue',
      });
      loadData();
    } catch (err: any) {
      console.error('Failed to reopen ticket:', err);
      Alert.alert('Error', err?.message || 'Failed to reopen ticket');
    }
  };

  const filterTabs = [
    { label: 'All', value: 'ALL', count: metrics.total },
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS', count: metrics.inProgress },
    { label: 'Action Needed', value: 'ACTION_NEEDED', count: metrics.actionNeeded },
    { label: 'Completed', value: 'COMPLETED', count: metrics.resolved },
  ];

  return (
    <ScreenShell
      title="Track My Tickets"
      subtitle="View live status, rate completed repairs & manage maintenance requests"
      iconName="ListOrdered"
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
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#6366f1" />}
        >
          {/* SECTION 1: SEARCH BAR */}
          <View className="px-4 pt-3 pb-2">
            <SearchFilterBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search ticket # or title..."
            />
          </View>

          {/* SECTION 2: HORIZONTAL FILTER CHIPS */}
          <View className="px-4 py-1.5">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
              {filterTabs.map((tab) => {
                const isActive = selectedStatusTab === tab.value;
                return (
                  <TouchableOpacity
                    key={tab.value}
                    activeOpacity={0.8}
                    onPress={() => setSelectedStatusTab(tab.value)}
                    className={`px-3.5 py-1.5 rounded-full border flex-row items-center me-1.5 ${
                      isActive
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border active:bg-muted'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {tab.label}
                    </Text>

                    {tab.count !== undefined && tab.count > 0 ? (
                      <View
                        className={`ms-1.5 px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-white/20' : 'bg-muted'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* SECTION 3: TICKET LIST OR EMPTY STATE */}
          <View className="px-4 pt-2">
            {filteredTickets.length === 0 ? (
              <View className="pt-6">
                <EmptyState
                  icon={CheckCircle2}
                  title="No Tickets Found"
                  description="You have no maintenance requests matching your selected search filter."
                />
              </View>
            ) : (
              filteredTickets.map((ticket: Complaint) => (
                <ComplaintCard
                  key={ticket._id}
                  complaint={ticket}
                  onPress={() => setSelectedComplaint(ticket)}
                  onConfirmPress={() => setSelectedComplaint(ticket)}
                  onCancelPress={() => setCancelTicketId(ticket._id)}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* TICKET DETAILS DRAWER SHEET */}
        <ComplaintDetailSheet
          visible={!!selectedComplaint}
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onAddComment={async (id, text) => {
            await addComment(id, text);
            loadData();
          }}
          onConfirmCompletion={async (id, payload) => {
            await confirmCompletion(id, payload);
            loadData();
          }}
          onCancelTicket={async (id) => {
            await updateStatus(id, { status: 'Cancelled', remarks: 'Cancelled by resident' });
            loadData();
          }}
          onReopenTicket={async (id, remarks) => {
            await handleReopenTicket(id, remarks);
          }}
          isResident={true}
        />

        {/* CANCEL TICKET CONFIRMATION MODAL */}
        <ConfirmationModal
          visible={!!cancelTicketId}
          onCancel={() => setCancelTicketId(null)}
          onConfirm={handleConfirmCancelTicket}
          title="Cancel Complaint Request?"
          message="Are you sure you want to cancel this ticket? The assigned team will be notified."
          confirmLabel="Yes, Cancel Ticket"
          cancelLabel="Keep Ticket"
          variant="danger"
        />
      </View>
    </ScreenShell>
  );
}

export default ResidentMyTicketsScreen;
