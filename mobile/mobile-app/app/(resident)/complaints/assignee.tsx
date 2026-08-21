import React, { useState } from 'react';
import { View, Linking } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { KPIRow } from '@/components/ui/KPIRow';
import { PaginatedList } from '@/components/ui/PaginatedList';

import { TicketDispatchCard } from '@/src/features/complaints/components/TicketDispatchCard';
import { TechnicianRosterCard } from '@/src/features/complaints/components/TechnicianRosterCard';
import { AssignTechnicianSheet } from '@/src/features/complaints/components/AssignTechnicianSheet';
import { useComplaintDispatch, TechnicianStaff } from '@/src/features/complaints/hooks/useComplaintDispatch';
import { TriageTicket } from '@/src/features/complaints/hooks/useComplaintTriage';

const DISPATCH_TABS = [
  { key: 'TICKETS', label: 'Unassigned Queue' },
  { key: 'ROSTER', label: 'Staff Roster' },
];

export default function TicketAssigneeDispatchScreen() {
  const {
    unassignedTickets,
    staffRoster,
    loading,
    error,
    kpis,
    fetchDispatchData,
    dispatchTicket,
    broadcastTicket,
  } = useComplaintDispatch();

  const [activeTab, setActiveTab] = useState<'TICKETS' | 'ROSTER'>('TICKETS');
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState<TriageTicket | null>(null);

  const handleOpenAssign = (ticket: TriageTicket) => {
    setSelectedTicketForAssign(ticket);
  };

  const handleConfirmAssign = async (ticketId: string, technicianId: string, technicianName: string, notes?: string) => {
    await dispatchTicket(ticketId, technicianId, notes);
    setSelectedTicketForAssign(null);
  };

  const handleCallTechnician = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    }
  };

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Top Dispatch KPI Metric Strip */}
      <KPIRow
        cards={[
          {
            title: 'Unassigned',
            value: String(kpis.unassignedCount),
            subtitle: 'Needs Dispatch',
            iconName: 'AlertCircle',
            variant: kpis.unassignedCount > 0 ? 'destructive' : 'default',
            onPress: () => setActiveTab('TICKETS'),
          },
          {
            title: 'On-Duty Staff',
            value: String(kpis.onDutyTechs),
            subtitle: 'Internal Team',
            iconName: 'UserCheck',
            variant: 'success',
            onPress: () => setActiveTab('ROSTER'),
          },
          {
            title: 'Contractors',
            value: String(kpis.activeContractors),
            subtitle: 'External Vendors',
            iconName: 'Wrench',
            variant: 'info',
            onPress: () => setActiveTab('ROSTER'),
          },
        ]}
      />

      {/* TabBar navigation */}
      <TabBar
        tabs={DISPATCH_TABS}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as any)}
        variant="pill"
        className="mx-0 my-0"
      />
    </View>
  );

  return (
    <ScreenShell
      title="Ticket Assignee Dispatch"
      subtitle="Allocate open tickets to internal staff and contractor vendors"
      iconName="UserCheck"
      error={error}
      onRetry={fetchDispatchData}
    >
      <View className="flex-1 bg-background">
        {activeTab === 'TICKETS' ? (
          <PaginatedList<TriageTicket>
            data={unassignedTickets}
            pagination={{
              currentPage: 1,
              totalPages: 1,
              totalRecords: unassignedTickets.length,
              limit: 50,
            }}
            onLoadMore={() => {}}
            onRefresh={fetchDispatchData}
            loading={loading && unassignedTickets.length === 0}
            ListHeaderComponent={renderHeader()}
            emptyIcon="ShieldCheck"
            emptyTitle="All Tickets Dispatched"
            emptySubtitle="No unassigned complaints currently waiting for technician allocation."
            contentContainerClassName="px-4 pt-3 pb-28 gap-3.5"
            renderItem={(item) => (
              <TicketDispatchCard
                key={item._id}
                item={item}
                onAssignPress={handleOpenAssign}
                onBroadcastPress={(t) => broadcastTicket(t._id)}
              />
            )}
          />
        ) : (
          <PaginatedList<TechnicianStaff>
            data={staffRoster}
            pagination={{
              currentPage: 1,
              totalPages: 1,
              totalRecords: staffRoster.length,
              limit: 50,
            }}
            onLoadMore={() => {}}
            onRefresh={fetchDispatchData}
            loading={loading && staffRoster.length === 0}
            ListHeaderComponent={renderHeader()}
            emptyIcon="UserCheck"
            emptyTitle="No Technicians on Roster"
            emptySubtitle="No internal technicians or contractor staff found on duty."
            contentContainerClassName="px-4 pt-3 pb-28 gap-3.5"
            renderItem={(tech) => (
              <TechnicianRosterCard
                key={tech._id}
                tech={tech}
                onCall={handleCallTechnician}
                onAssign={(t) => {
                  if (selectedTicketForAssign) {
                    handleConfirmAssign(selectedTicketForAssign._id, t._id, t.name);
                  }
                }}
              />
            )}
          />
        )}
      </View>

      {/* Assign Technician BottomSheet */}
      <AssignTechnicianSheet
        visible={!!selectedTicketForAssign}
        ticket={selectedTicketForAssign}
        technicians={staffRoster}
        onClose={() => setSelectedTicketForAssign(null)}
        onAssign={handleConfirmAssign}
      />
    </ScreenShell>
  );
}
