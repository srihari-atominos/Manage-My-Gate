import React from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { StatusVariant } from '@/components/ui/StatusBadge';

import { useAdminMaintenance } from '../../../src/features/amenities/hooks/useAdminMaintenance';
import { MaintenanceModal } from '../../../src/features/amenities/components/MaintenanceModal';
import { MaintenanceTask } from '../../../src/features/amenities/store/amenitySlice';

export default function AmenityMaintenanceScheduleScreen() {
  const {
    amenities,
    maintenanceList,
    loading,
    error,
    isModalOpen,
    editingTask,
    deleteTargetTask,
    setDeleteTargetTask,
    scheduling,
    loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleScheduleSubmit,
    handleConfirmDelete,
  } = useAdminMaintenance();

  const statusVariantMap: Record<string, StatusVariant> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
  };

  const renderTaskItem = (item: MaintenanceTask) => {
    const statusRaw = (item.status || 'scheduled').toLowerCase();
    const formattedDates = `${item.startDate} to ${item.endDate} ${
      item.startTime ? `• ${item.startTime} - ${item.endTime || ''}` : ''
    }`;

    const parentAmenity = amenities.find(a => a._id === item.amenityId);
    const imageUrl = parentAmenity?.imageUrl;

    return (
      <View key={item._id} className="mb-2">
        <ListCard
          title={`${item.amenityName || 'Facility'} • ${item.title}`}
          subtitle={`Schedule: ${formattedDates} • Staff: ${item.assignedStaff || 'Unassigned'}`}
          backgroundImage={imageUrl}
          leftIcon="Wrench"
          leftIconBgColor={imageUrl ? 'rgba(255,255,255,0.2)' : '#fef3c7'}
          leftIconColor={imageUrl ? '#ffffff' : '#d97706'}
          status={{
            label: statusRaw.replace('_', ' ').toUpperCase(),
            variant: statusVariantMap[statusRaw] || 'neutral',
          }}
          onPress={() => handleOpenEditModal(item)}
        />
        <View className="flex-row justify-end gap-2 px-1 -mt-1 mb-2">
          <Button
            variant="outline"
            onPress={() => handleOpenEditModal(item)}
            className="py-1 px-3 border-primary/30 bg-primary/10"
          >
            <Text className="text-primary text-xs font-bold">Edit Task</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => setDeleteTargetTask(item)}
            className="py-1 px-3 border-red-500/30 bg-red-500/10"
          >
            <Text className="text-red-600 dark:text-red-400 text-xs font-semibold">Delete</Text>
          </Button>
        </View>
      </View>
    );
  };

  return (
    <ScreenShell
      title="Maintenance & Upkeep Tasks"
      subtitle="Track upkeep tasks, blackout schedules & staff assignments"
      iconName="Wrench"
      loading={loading && maintenanceList.length === 0}
      error={error}
      onRetry={loadData}
    >
      <View className="flex-1 px-4 pt-2">
        {/* Header Action Row */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 me-2">
            <Text variant="large" className="font-bold text-foreground">
              Maintenance Tasks ({maintenanceList.length})
            </Text>
            <Text variant="muted" className="text-xs text-muted-foreground">
              Scheduled facility upkeep and blackout windows.
            </Text>
          </View>
          <Button variant="default" onPress={handleOpenCreateModal} className="bg-amber-600 px-3.5 py-3">
            <Text className="text-white font-bold text-xs">+ Schedule Task</Text>
          </Button>
        </View>

        {/* Scheduled Maintenance Task List */}
        <PaginatedList
          data={maintenanceList}
          renderItem={renderTaskItem}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: maintenanceList.length,
            limit: 50,
          }}
          onLoadMore={() => {}}
          onRefresh={loadData}
          loading={loading}
          emptyIcon="CheckCircle2"
          emptyTitle="No Maintenance Scheduled"
          emptySubtitle="All community facilities are operational with no scheduled upkeep tasks."
          contentContainerClassName="pb-6"
        />
      </View>

      {/* Schedule / Edit Maintenance Modal */}
      <MaintenanceModal
        visible={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleScheduleSubmit}
        amenities={amenities}
        initialData={editingTask}
        loading={scheduling}
      />

      {/* Delete Maintenance Confirmation Modal */}
      <ConfirmationModal
        visible={!!deleteTargetTask}
        title="Delete Maintenance Task?"
        message={`Are you sure you want to delete "${deleteTargetTask?.title}" for ${deleteTargetTask?.amenityName}? This will unblock conflicting resident reservation slots.`}
        variant="danger"
        confirmLabel="Delete Task"
        cancelLabel="Keep Task"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetTask(null)}
      />
    </ScreenShell>
  );
}
