import React from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Plus } from 'lucide-react-native';

import { useAdminMaintenance } from '../../../src/features/amenities/hooks/useAdminMaintenance';
import { MaintenanceTaskCard } from '../../../src/features/amenities/components/MaintenanceTaskCard';
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

  const renderTaskItem = (item: MaintenanceTask) => {
    const parentAmenity = amenities.find((a) => a._id === item.amenityId);
    const imageUrl = parentAmenity?.imageUrl;

    return (
      <MaintenanceTaskCard
        key={item._id}
        task={item}
        facilityImageUrl={imageUrl}
        onEdit={handleOpenEditModal}
        onDelete={setDeleteTargetTask}
      />
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
      headerRight={
        <Button
          variant="default"
          size="sm"
          onPress={handleOpenCreateModal}
          className="flex-row items-center gap-1.5 rounded-full"
          accessibilityLabel="Schedule Maintenance Task"
        >
          <Plus size={14} className="text-primary-foreground" />
          <Text className="text-primary-foreground font-bold text-xs">Schedule Task</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Scheduled Maintenance Task List */}
        <PaginatedList<MaintenanceTask>
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
          emptyIcon="CircleCheck"
          emptyTitle="No Maintenance Scheduled"
          emptySubtitle="All community facilities are operational with no scheduled upkeep tasks."
          contentContainerClassName="p-4 gap-3.5 pb-28"
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
