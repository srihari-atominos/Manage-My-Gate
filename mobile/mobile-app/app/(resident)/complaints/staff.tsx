import React, { useState } from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { KPIRow } from '@/components/ui/KPIRow';
import { PaginatedList } from '@/components/ui/PaginatedList';

import { TechnicianWorkOrderCard } from '@/src/features/complaints/components/TechnicianWorkOrderCard';
import { ProofOfWorkModal } from '@/src/features/complaints/components/ProofOfWorkModal';
import { useTechnicianWorkbench, WorkOrderItem } from '@/src/features/complaints/hooks/useTechnicianWorkbench';
import { Attachment } from '@/components/ui/AttachmentPicker';

const TECHNICIAN_TABS = [
  { key: 'ALL', label: 'All Jobs' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function FieldTechnicianWorkbenchScreen() {
  const {
    workOrders,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    kpis,
    fetchWorkOrders,
    acceptTask,
    startJob,
    pauseJob,
    resumeJob,
    completeJob,
  } = useTechnicianWorkbench();

  const [selectedTicketForProof, setSelectedTicketForProof] = useState<WorkOrderItem | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState<boolean>(false);
  const [submittingProof, setSubmittingProof] = useState<boolean>(false);

  const handleOpenProof = (id: string) => {
    const item = workOrders.find((w) => w._id === id);
    if (item) {
      setSelectedTicketForProof(item);
      setProofModalOpen(true);
    }
  };

  const handleProofSubmit = async (data: { notes: string; partsUsed: string; attachments: Attachment[] }) => {
    if (!selectedTicketForProof) return;
    setSubmittingProof(true);
    try {
      await completeJob(selectedTicketForProof._id, data);
      setProofModalOpen(false);
      setSelectedTicketForProof(null);
    } finally {
      setSubmittingProof(false);
    }
  };

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Top KPI Metric Strip */}
      <KPIRow
        cards={[
          {
            title: 'Assigned',
            value: String(kpis.assigned),
            subtitle: 'New Work Orders',
            iconName: 'Clock',
            variant: kpis.assigned > 0 ? 'info' : 'default',
            onPress: () => setStatusFilter('ASSIGNED'),
          },
          {
            title: 'In Progress',
            value: String(kpis.inProgress),
            subtitle: 'Active On-Site',
            iconName: 'Wrench',
            variant: kpis.inProgress > 0 ? 'warning' : 'default',
            onPress: () => setStatusFilter('IN_PROGRESS'),
          },
          {
            title: 'Resolved Today',
            value: String(kpis.completed),
            subtitle: 'Work Signed Off',
            iconName: 'CheckCircle2',
            variant: 'success',
            onPress: () => setStatusFilter('COMPLETED'),
          },
        ]}
      />

      {/* Status Filter TabBar */}
      <TabBar
        tabs={TECHNICIAN_TABS}
        activeTab={statusFilter}
        onTabChange={(key) => setStatusFilter(key as any)}
        variant="pill"
        className="mx-0 my-0"
      />
    </View>
  );

  return (
    <ScreenShell
      title="Field Technician Workbench"
      subtitle="Active service work orders, timers & proof of work"
      iconName="Wrench"
      error={error}
      onRetry={fetchWorkOrders}
    >
      <View className="flex-1 bg-background">
        {/* Work Order Feed */}
        <PaginatedList<WorkOrderItem>
          data={workOrders}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: workOrders.length,
            limit: 50,
          }}
          onLoadMore={() => {}}
          onRefresh={fetchWorkOrders}
          loading={loading && workOrders.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Wrench"
          emptyTitle="No Service Orders Found"
          emptySubtitle="No work orders match the selected status filter."
          contentContainerClassName="px-4 pt-3 pb-28 gap-3.5"
          renderItem={(item) => (
            <TechnicianWorkOrderCard
              key={item._id}
              item={item}
              onAccept={acceptTask}
              onStart={startJob}
              onPause={pauseJob}
              onResume={resumeJob}
              onComplete={handleOpenProof}
            />
          )}
        />
      </View>

      {/* Proof of Work Modal */}
      <ProofOfWorkModal
        visible={proofModalOpen}
        workOrderId={selectedTicketForProof?._id || null}
        ticketNumber={selectedTicketForProof?.complaintNumber}
        loading={submittingProof}
        onClose={() => {
          setProofModalOpen(false);
          setSelectedTicketForProof(null);
        }}
        onSubmit={handleProofSubmit}
      />
    </ScreenShell>
  );
}
