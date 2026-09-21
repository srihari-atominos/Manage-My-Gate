import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { TextInput } from '@/components/forms/TextInput';
import { Plus, Search, X, RotateCcw } from 'lucide-react-native';

import { useAdminMaintenance } from '../../../src/features/amenities/hooks/useAdminMaintenance';
import { AmenityMaintenanceCard } from '../../../src/features/amenities/components/AmenityMaintenanceCard';
import { MaintenanceModal } from '../../../src/features/amenities/components/MaintenanceModal';
import { Amenity, MaintenanceTask } from '../../../src/features/amenities/store/amenitySlice';

type StatusFilterType = 'ALL' | 'MAINTENANCE' | 'OPERATIONAL';

export interface AmenityMaintenanceItem {
  amenity: Amenity;
  activeTask?: MaintenanceTask | null;
}

export default function AmenityMaintenanceScheduleScreen() {
  const {
    amenities,
    maintenanceList,
    loading,
    error,
    isModalOpen,
    editingTask,
    selectedAmenityId,
    deleteTargetTask,
    setDeleteTargetTask,
    scheduling,
    loadData,
    handleLoadMore,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleScheduleSubmit,
    handleConfirmDelete,
  } = useAdminMaintenance();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');

  // Pair each amenity from Amenities Master with its active scheduled upkeep task
  const amenityMaintenanceItems: AmenityMaintenanceItem[] = useMemo(() => {
    const list: AmenityMaintenanceItem[] = amenities.map((amenity) => {
      const activeTask =
        maintenanceList.find((t) => {
          const matchAmenity =
            String(t.amenityId) === String(amenity._id) ||
            (t.amenityName &&
              amenity.name &&
              t.amenityName.trim().toLowerCase() === amenity.name.trim().toLowerCase());
          const s = String(t.status || '').toUpperCase();
          return matchAmenity && s !== 'CANCELLED' && s !== 'COMPLETED';
        }) || null;

      return {
        amenity,
        activeTask,
      };
    });

    // Also include any ad-hoc custom maintenance tasks without a matching master amenity
    maintenanceList.forEach((task) => {
      const s = String(task.status || '').toUpperCase();
      if (s === 'CANCELLED' || s === 'COMPLETED') return;

      const alreadyLinked = list.some(
        (item) =>
          String(item.amenity._id) === String(task.amenityId) ||
          (item.amenity.name &&
            task.amenityName &&
            item.amenity.name.trim().toLowerCase() === task.amenityName.trim().toLowerCase())
      );
      if (!alreadyLinked) {
        list.push({
          amenity: {
            _id: task.amenityId || 'OTHER',
            name: task.amenityName || task.title || 'Custom Facility',
            category: task.maintenanceType || 'General',
            location: 'Community Facility',
          },
          activeTask: task,
        });
      }
    });

    return list;
  }, [amenities, maintenanceList]);

  // Compute status counts for filter badges
  const counts = useMemo(() => {
    let maintenance = 0;
    let operational = 0;

    amenityMaintenanceItems.forEach((item) => {
      const s = String(item.activeTask?.status || '').toUpperCase();
      const isMaint = Boolean(item.activeTask && s !== 'CANCELLED' && s !== 'COMPLETED');
      if (isMaint) maintenance++;
      else operational++;
    });

    return {
      all: amenityMaintenanceItems.length,
      maintenance,
      operational,
    };
  }, [amenityMaintenanceItems]);

  // Filter items by status and search query
  const filteredItems = useMemo(() => {
    return amenityMaintenanceItems.filter((item) => {
      const s = String(item.activeTask?.status || '').toUpperCase();
      const hasActiveMaintenance = Boolean(item.activeTask && s !== 'CANCELLED' && s !== 'COMPLETED');

      // Status filter
      if (statusFilter === 'MAINTENANCE' && !hasActiveMaintenance) return false;
      if (statusFilter === 'OPERATIONAL' && hasActiveMaintenance) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.amenity.name?.toLowerCase().includes(q);
        const matchesCategory = item.amenity.category?.toLowerCase().includes(q);
        const matchesLocation = item.amenity.location?.toLowerCase().includes(q);
        const matchesTaskTitle = item.activeTask?.title?.toLowerCase().includes(q);
        const matchesTaskType = item.activeTask?.maintenanceType?.toLowerCase().includes(q);
        const matchesTaskDesc = item.activeTask?.description?.toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesCategory &&
          !matchesLocation &&
          !matchesTaskTitle &&
          !matchesTaskType &&
          !matchesTaskDesc
        ) {
          return false;
        }
      }

      return true;
    });
  }, [amenityMaintenanceItems, statusFilter, searchQuery]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  const renderItem = (item: AmenityMaintenanceItem) => {
    return (
      <AmenityMaintenanceCard
        key={item.amenity._id}
        amenity={item.amenity}
        activeTask={item.activeTask}
        onSchedule={handleOpenCreateModal}
        onEditTask={handleOpenEditModal}
        onDeleteTask={setDeleteTargetTask}
      />
    );
  };

  const renderListHeader = () => {
    return (
      <View className="gap-3 mb-2">
        {/* Search Bar */}
        <View className="relative">
          <TextInput
            placeholder="Search amenities by name, category, upkeep task..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={16} className="text-muted-foreground" />}
            rightIcon={
              searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={15} className="text-muted-foreground" />
                </TouchableOpacity>
              ) : undefined
            }
          />
        </View>

        {/* Status Filter Chips */}
        <View className="flex-row items-center gap-2">
          {[
            { key: 'ALL', label: 'All', count: counts.all },
            { key: 'MAINTENANCE', label: 'Under Maintenance', count: counts.maintenance },
            { key: 'OPERATIONAL', label: 'Operational', count: counts.operational },
          ].map((item) => {
            const isSelected = statusFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setStatusFilter(item.key as StatusFilterType)}
                activeOpacity={0.7}
                className={`flex-1 py-2 px-2 rounded-xl border items-center justify-center flex-row gap-1.5 ${
                  isSelected ? 'bg-primary border-primary' : 'bg-card border-border/80'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-primary-foreground font-bold' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </Text>
                <View
                  className={`px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20' : 'bg-muted'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected ? 'text-white' : 'text-muted-foreground'
                    }`}
                  >
                    {item.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section Counter & Reset */}
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm font-bold text-foreground">
            Facilities ({filteredItems.length}
            {filteredItems.length !== amenityMaintenanceItems.length
              ? ` of ${amenityMaintenanceItems.length}`
              : ''}
            )
          </Text>
          {(searchQuery || statusFilter !== 'ALL') && (
            <TouchableOpacity onPress={resetFilters} className="flex-row items-center gap-1">
              <RotateCcw size={12} className="text-muted-foreground" />
              <Text className="text-xs font-medium text-muted-foreground">Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenShell
      title="Maintenance Tasks"
      subtitle="Track facility upkeep & tasks"
      loading={loading && amenityMaintenanceItems.length === 0}
      error={error}
      onRetry={loadData}
      headerRight={
        <Button
          size="sm"
          onPress={() => handleOpenCreateModal()}
          className="flex-row items-center gap-1 rounded-full px-2.5 h-8 bg-emerald-600 active:bg-emerald-700"
          accessibilityLabel="Schedule Task"
        >
          <Plus size={14} color="#FFFFFF" />
          <Text className="text-white font-bold text-xs">Schedule</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* Unified Amenity Maintenance Card List */}
        <PaginatedList<AmenityMaintenanceItem>
          data={filteredItems}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader()}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: filteredItems.length,
            limit: 50,
          }}
          onLoadMore={handleLoadMore}
          onRefresh={loadData}
          loading={loading}
          emptyIcon="CircleCheck"
          emptyTitle={
            searchQuery || statusFilter !== 'ALL'
              ? 'No Matching Facilities Found'
              : 'No Community Facilities'
          }
          emptySubtitle={
            searchQuery || statusFilter !== 'ALL'
              ? 'Try changing your search terms or resetting the active filters.'
              : 'Create community facilities in Amenities Master to schedule maintenance.'
          }
          contentContainerClassName="p-4 gap-3 pb-28"
        />
      </View>

      {/* Schedule / Edit Maintenance Modal */}
      <MaintenanceModal
        visible={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleScheduleSubmit}
        amenities={amenities}
        initialData={editingTask}
        initialAmenityId={selectedAmenityId}
        loading={scheduling}
      />

      {/* Cancel Maintenance Confirmation Modal */}
      <ConfirmationModal
        visible={!!deleteTargetTask}
        title="Cancel Maintenance Window?"
        message={`Are you sure you want to cancel the maintenance window "${deleteTargetTask?.reason || (deleteTargetTask as any)?.title || 'Maintenance'}"? This will unblock conflicting resident reservation slots.`}
        variant="danger"
        confirmLabel="Cancel Maintenance"
        cancelLabel="Keep Window"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetTask(null)}
      />
    </ScreenShell>
  );
}
