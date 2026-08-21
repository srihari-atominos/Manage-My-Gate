import React, { useState } from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIRow } from '@/components/ui/KPIRow';
import { PaginatedList } from '@/components/ui/PaginatedList';

import { ComplaintFilterStrip } from '@/src/features/complaints/components/ComplaintFilterStrip';
import { ComplaintTriageCard } from '@/src/features/complaints/components/ComplaintTriageCard';
import { TicketStatusUpdateModal } from '@/src/features/complaints/components/TicketStatusUpdateModal';
import { TicketEscalationModal } from '@/src/features/complaints/components/TicketEscalationModal';
import { AssignTechnicianSheet } from '@/src/features/complaints/components/AssignTechnicianSheet';
import { useComplaintTriage, TriageTicket } from '@/src/features/complaints/hooks/useComplaintTriage';
import { useComplaintDispatch } from '@/src/features/complaints/hooks/useComplaintDispatch';

const CATEGORY_CHIPS = ['All', 'Plumbing', 'Electrical', 'HVAC', 'Civil', 'Security'];

export default function TicketTriageScreen() {
  const {
    tickets,
    loading,
    error,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    kpis,
    fetchTriageTickets,
    updateTicketStatus,
    escalateTicket,
    assignTicket,
  } = useComplaintTriage();

  const { staffRoster } = useComplaintDispatch();

  const [statusModalTicket, setStatusModalTicket] = useState<TriageTicket | null>(null);
  const [escalateModalTicket, setEscalateModalTicket] = useState<TriageTicket | null>(null);
  const [assignSheetTicket, setAssignSheetTicket] = useState<TriageTicket | null>(null);

  const handleStatusSubmit = async (id: string, newStatus: string, remarks?: string) => {
    await updateTicketStatus(id, newStatus, remarks);
    setStatusModalTicket(null);
  };

  const handleEscalateSubmit = async (id: string, reason: string) => {
    await escalateTicket(id, reason);
    setEscalateModalTicket(null);
  };

  const handleAssignSubmit = async (ticketId: string, technicianId: string, technicianName: string) => {
    await assignTicket(ticketId, technicianId, technicianName);
    setAssignSheetTicket(null);
  };

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Top Triage KPI Metric Strip */}
      <KPIRow
        cards={[
          {
            title: 'Unassigned',
            value: String(kpis.unassigned),
            subtitle: 'Needs Dispatch',
            iconName: 'AlertCircle',
            variant: kpis.unassigned > 0 ? 'destructive' : 'default',
            onPress: () => setSelectedStatus(selectedStatus === 'UNASSIGNED' ? 'All' : 'UNASSIGNED'),
          },
          {
            title: 'Critical / SLA',
            value: String(kpis.critical),
            subtitle: 'High Priority',
            iconName: 'Clock',
            variant: kpis.critical > 0 ? 'warning' : 'default',
          },
          {
            title: 'In Progress',
            value: String(kpis.inProgress),
            subtitle: 'Active Jobs',
            iconName: 'Wrench',
            variant: 'info',
            onPress: () => setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? 'All' : 'IN_PROGRESS'),
          },
          {
            title: 'Resolved',
            value: String(kpis.resolved),
            subtitle: 'Completed',
            iconName: 'CheckCircle2',
            variant: 'success',
            onPress: () => setSelectedStatus(selectedStatus === 'RESOLVED' ? 'All' : 'RESOLVED'),
          },
        ]}
      />

      {/* Reusable Search & Category Filter Strip */}
      <ComplaintFilterStrip
        searchValue={search}
        onSearchChange={setSearch}
        categories={CATEGORY_CHIPS}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        placeholder="Search ticket #, resident, location..."
      />
    </View>
  );

  return (
    <ScreenShell
      title="Ticket Triage Board"
      subtitle="Triage incoming requests, track SLA & escalate issues"
      iconName="Kanban"
      error={error}
      onRetry={fetchTriageTickets}
    >
      <View className="flex-1 bg-background">
        {/* Triage Tickets Feed */}
        <PaginatedList<TriageTicket>
          data={tickets}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: tickets.length,
            limit: 50,
          }}
          onLoadMore={() => {}}
          onRefresh={fetchTriageTickets}
          loading={loading && tickets.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Inbox"
          emptyTitle="No Complaints in Queue"
          emptySubtitle="All tickets have been triaged or none match active filters."
          contentContainerClassName="px-4 pt-3 pb-28 gap-3.5"
          renderItem={(item) => (
            <ComplaintTriageCard
              key={item._id}
              item={item}
              onStatusClick={(t) => setStatusModalTicket(t)}
              onEscalateClick={(t) => setEscalateModalTicket(t)}
              onAssignClick={(t) => setAssignSheetTicket(t)}
            />
          )}
        />
      </View>

      {/* Status Update Modal */}
      <TicketStatusUpdateModal
        visible={!!statusModalTicket}
        ticket={statusModalTicket}
        onClose={() => setStatusModalTicket(null)}
        onSubmit={handleStatusSubmit}
      />

      {/* Ticket Escalation Modal */}
      <TicketEscalationModal
        visible={!!escalateModalTicket}
        ticket={escalateModalTicket}
        onClose={() => setEscalateModalTicket(null)}
        onConfirm={handleEscalateSubmit}
      />

      {/* Assign Technician BottomSheet */}
      <AssignTechnicianSheet
        visible={!!assignSheetTicket}
        ticket={assignSheetTicket}
        technicians={staffRoster}
        onClose={() => setAssignSheetTicket(null)}
        onAssign={handleAssignSubmit}
      />
    </ScreenShell>
  );
}
