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
import { ComplaintFilterDrawer, ComplaintFilterValues } from '../components/ComplaintFilterDrawer';
import { Complaint } from '../types';
import { getStatusTabStyle } from '@/components/ui/statusTabColors';
import { useTranslation } from '@/src/utils/i18n';

export function ResidentMyTicketsScreen() {
  const { t } = useTranslation();
  const {
    complaints,
    isLoading,
    error,
    fetchComplaints,
    addComment,
    confirmCompletion,
    updateStatus,
    deleteComplaint,
    clearErrors
  } = useComplaints();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState<ComplaintFilterValues>({
    status: 'ALL',
    priority: 'ALL',
    category: 'ALL',
  });

  // Modal States
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

  // Filtered List based on Search Query, Tab Filter & Drawer Filters
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
        if (!['Submitted', 'Open', 'Waiting For Assignment'].includes(item.status)) return false;
      } else if (selectedStatusTab === 'IN_PROGRESS') {
        if (!['Assigned', 'In Progress', 'Accepted'].includes(item.status)) return false;
      } else if (selectedStatusTab === 'ACTION_NEEDED') {
        if (!['Work Completed', 'Waiting For Resident Confirmation'].includes(item.status)) return false;
      } else if (selectedStatusTab === 'COMPLETED') {
        if (!['Closed', 'Completed'].includes(item.status)) return false;
      }

      // 3. Drawer Priority Filter
      if (drawerFilters.priority && drawerFilters.priority !== 'ALL') {
        if (item.priority?.toLowerCase() !== drawerFilters.priority.toLowerCase()) return false;
      }

      // 4. Drawer Category Filter
      if (drawerFilters.category && drawerFilters.category !== 'ALL') {
        if (item.category?.toLowerCase() !== drawerFilters.category.toLowerCase()) return false;
      }

      // 5. Drawer Status Filter
      if (drawerFilters.status && drawerFilters.status !== 'ALL') {
        if (item.status?.toLowerCase() !== drawerFilters.status.toLowerCase()) return false;
      }

      return true;
    });
  }, [complaints, searchQuery, selectedStatusTab, drawerFilters]);

  const activeDrawerCount =
    (drawerFilters.status !== 'ALL' && drawerFilters.status ? 1 : 0) +
    (drawerFilters.priority !== 'ALL' && drawerFilters.priority ? 1 : 0) +
    (drawerFilters.category !== 'ALL' && drawerFilters.category ? 1 : 0);

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

  const handleConfirmDeleteTicket = async (id: string) => {
    try {
      await deleteComplaint(id);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete ticket:', err);
      Alert.alert('Error', err?.message || 'Failed to delete ticket');
      throw err;
    }
  };

  const filterTabs = [
    { label: t('all', 'All'), value: 'ALL', count: metrics.total },
    { label: t('open', 'Open'), value: 'OPEN' },
    { label: t('in_progress', 'In Progress'), value: 'IN_PROGRESS', count: metrics.inProgress },
    { label: t('action_needed', 'Action Needed'), value: 'ACTION_NEEDED', count: metrics.actionNeeded },
    { label: t('completed', 'Completed'), value: 'COMPLETED', count: metrics.resolved },
  ];

  return (
    <ScreenShell
      title={t('track_my_tickets', 'Track My Tickets')}
      subtitle={t('track_my_tickets_sub', 'View live status, rate completed repairs & manage maintenance requests')}
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          alwaysBounceVertical={true}
          bounces={true}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#FF6A00" colors={['#FF6A00']} />}
        >
          {/* SECTION 1: SEARCH BAR */}
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('search_ticket_placeholder', 'Search ticket # or title...')}
            onFilterPress={() => setIsFilterOpen(true)}
            activeFilterCount={activeDrawerCount}
          />

          {/* SECTION 2: HORIZONTAL FILTER CHIPS */}
          <View className="px-4 py-1.5">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
              {filterTabs.map((tab) => {
                const isActive = selectedStatusTab === tab.value;
                const statusStyle = getStatusTabStyle(tab.value || tab.label, isActive);
                return (
                  <TouchableOpacity
                    key={tab.value}
                    activeOpacity={0.8}
                    onPress={() => setSelectedStatusTab(tab.value)}
                    className={`px-3.5 py-1.5 rounded-full border flex-row items-center me-1.5 ${statusStyle.containerClass}`}
                  >
                    <Text
                      className={`text-xs ${statusStyle.textClass}`}
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
                  title={t('no_tickets_found', 'No Tickets Found')}
                  description={t('no_tickets_desc', 'You have no maintenance requests matching your selected search filter.')}
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
          onDeleteTicket={async (id) => {
            await handleConfirmDeleteTicket(id);
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

export default ResidentMyTicketsScreen;
