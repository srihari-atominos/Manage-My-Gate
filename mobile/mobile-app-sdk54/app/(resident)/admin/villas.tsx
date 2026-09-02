import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { KPICard } from '@/components/ui/KPICard';
import { Text } from '@/components/ui/text';
import { FAB } from '@/components/ui/FAB';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FileSpreadsheet, PlusCircle, Zap, FilterX, Building2 } from 'lucide-react-native';
import { useVilla } from '@/src/features/villa/hooks/useVilla';
import { useVillaSocket } from '@/src/features/villa/hooks/useVillaSocket';
import { VillaCard } from '@/src/features/villa/components/VillaCard';
import { VillaDetailsModal } from '@/src/features/villa/components/VillaDetailsModal';
import { VillaFormModal } from '@/src/features/villa/components/VillaFormModal';
import { BatchGenerateModal } from '@/src/features/villa/components/BatchGenerateModal';
import { BulkUploadVillasModal } from '@/src/features/villa/components/BulkUploadVillasModal';
import { Villa } from '@/src/features/villa/store/villaSlice';
import { VillaPayload, BatchGenerateParams } from '@/src/features/villa/services/villaService';
import { getStatusTabStyle } from '@/components/ui/statusTabColors';

export default function VillaManagementScreen() {
  const {
    villas,
    blocks,
    stats,
    loading,
    actionLoading,
    error,
    filters,
    fetchVillas,
    fetchBlocks,
    fetchStats,
    createUnit,
    updateUnit,
    deleteUnit,
    batchGenerate,
    bulkUpload,
    downloadTemplate,
    setSearch,
    setBlock,
    setStatus,
  } = useVilla();

  // Connect real-time socket listener
  useVillaSocket();

  // Local state for modals
  const [selectedVilla, setSelectedVilla] = useState<Villa | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [bulkUploadModalVisible, setBulkUploadModalVisible] = useState(false);

  useEffect(() => {
    fetchVillas();
    fetchBlocks();
    fetchStats();
  }, []);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    fetchVillas({ search: text, page: 1 });
  };

  const handleStatusFilter = (statusVal: string) => {
    const nextStatus = filters.status === statusVal ? '' : statusVal;
    setStatus(nextStatus);
    fetchVillas({ status: nextStatus, page: 1 });
  };

  const handleBlockFilter = (blockVal: string) => {
    const nextBlock = filters.blockOrBuilding === blockVal ? '' : blockVal;
    setBlock(nextBlock);
    fetchVillas({ blockOrBuilding: nextBlock, page: 1 });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setBlock('');
    fetchVillas({ search: '', status: '', blockOrBuilding: '', page: 1 });
  };

  const handleCardPress = (villa: Villa) => {
    setSelectedVilla(villa);
    setDetailsModalVisible(true);
  };

  const handleOpenCreateForm = () => {
    setEditingVilla(null);
    setFormModalVisible(true);
  };

  const handleOpenEditForm = (villa: Villa) => {
    setEditingVilla(villa);
    setFormModalVisible(true);
  };

  const handleFormSubmit = async (data: VillaPayload) => {
    if (editingVilla) {
      await updateUnit(editingVilla._id, data);
    } else {
      await createUnit(data);
    }
  };

  const handleDeleteUnit = async (villa: Villa) => {
    await deleteUnit(villa._id);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.blockOrBuilding) count++;
    if (filters.status) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const availableStatuses = ['Vacant', 'Occupied', 'Under Maintenance', 'Under Renovation', 'For Sale', 'For Rent'];

  return (
    <ScreenShell
      title="Unit & Villa Management"
      subtitle="Configure community blocks, unit statuses, and occupants"
      iconName="Home"
      permission="villas:read"
      error={error}
      onRetry={() => {
        fetchVillas();
        fetchStats();
      }}
    >
      <View className="flex-1 bg-background relative">
        {/* KPI Stats Horizontal Row */}
        <View className="border-b border-border/50 bg-card/40 py-2.5 px-4 shrink-0">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex-row items-center gap-2">
              <KPICard title="TOTAL UNITS" value={stats.total || 0} iconName="Building2" iconColor="#0d9488" />
              <KPICard title="OCCUPIED" value={stats.occupied || 0} iconName="UserCheck" iconColor="#16a34a" />
              <KPICard title="VACANT" value={stats.vacant || 0} iconName="DoorOpen" iconColor="#6b7280" />
              <KPICard title="MAINTENANCE" value={stats.maintenance || 0} iconName="Wrench" iconColor="#eab308" />
            </View>
          </ScrollView>
        </View>

        {/* Primary Creation Action Toolbar */}
        <View className="px-4 py-2 border-b border-border/40 bg-card/20 shrink-0">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={handleOpenCreateForm}
                className="px-3 py-2 rounded-xl bg-emerald-600 border border-emerald-600 flex-row items-center gap-1.5 active:bg-emerald-700 shadow-xs"
              >
                <Icon as={PlusCircle} size={15} color="#ffffff" className="text-white" />
                <Text className="text-xs font-bold text-white">Create Unit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBulkUploadModalVisible(true)}
                className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 flex-row items-center gap-1.5 active:bg-blue-500/20"
              >
                <Icon as={FileSpreadsheet} size={15} color="#2563eb" className="text-blue-600" />
                <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">Bulk Upload</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBatchModalVisible(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex-row items-center gap-1.5 active:bg-amber-500/20"
              >
                <Icon as={Zap} size={15} color="#d97706" className="text-amber-600" />
                <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">Batch Generate</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Search & Filter Bar */}
        <SearchFilterBar
          searchValue={filters.search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search unit number..."
          onFilterPress={handleClearFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Inline Filter Chips Row */}
        <View className="px-4 py-2 border-b border-border/40 shrink-0 space-y-1.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex-row items-center gap-2">
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  onPress={handleClearFilters}
                  className="px-2.5 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 flex-row items-center gap-1"
                >
                  <Icon as={FilterX} size={13} className="text-destructive" />
                  <Text className="text-xs font-bold text-destructive">Clear ({activeFilterCount})</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleStatusFilter('')}
                className={`px-3 py-1.5 rounded-full border text-xs flex-row items-center justify-center ${
                  !filters.status ? 'bg-blue-600 border-blue-600' : 'bg-card border-border'
                }`}
              >
                <Text className={`text-xs font-semibold ${!filters.status ? 'text-white' : 'text-foreground'}`}>
                  All Statuses
                </Text>
              </TouchableOpacity>

              {availableStatuses.map((st) => {
                const isSel = filters.status === st;
                const statusStyle = getStatusTabStyle(st, isSel);
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => handleStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-full border text-xs flex-row items-center justify-center ${statusStyle.containerClass}`}
                  >
                    <Text className={`text-xs ${statusStyle.textClass}`}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {blocks && blocks.length > 0 && blocks.map((blk) => {
                const isSel = filters.blockOrBuilding === blk;
                return (
                  <TouchableOpacity
                    key={blk}
                    onPress={() => handleBlockFilter(blk)}
                    className={`px-3 py-1.5 rounded-full border text-xs flex-row items-center justify-center ${
                      isSel ? 'bg-secondary border-secondary' : 'bg-muted/80 border-border'
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${isSel ? 'text-secondary-foreground' : 'text-foreground'}`}>
                      {blk}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Main Directory & List Container */}
        {loading && villas.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color="#0d9488" />
            <Text variant="muted" className="text-xs mt-2">Loading units directory...</Text>
          </View>
        ) : villas.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6">
            <EmptyState
              icon={Building2}
              title="No Units Found"
              description="No community units match the active search or filters. You can batch generate, bulk upload, or manually create new units."
              actionLabel="Batch Generate 54 Units"
              onAction={() => setBatchModalVisible(true)}
            />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Directory Header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-bold text-muted-foreground uppercase">
                Unit Directory ({villas.length})
              </Text>
            </View>

            {/* Render Villa Cards */}
            {villas.map((villa: Villa) => (
              <VillaCard
                key={villa._id}
                villa={villa}
                onPress={handleCardPress}
              />
            ))}
          </ScrollView>
        )}

        {/* Floating Action Button */}
        <FAB
          iconName="Plus"
          label="Add Unit"
          onPress={handleOpenCreateForm}
          variant="primary"
        />
      </View>

      {/* Details Bottom Sheet Modal */}
      {detailsModalVisible && selectedVilla ? (
        <VillaDetailsModal
          visible={detailsModalVisible}
          onClose={() => setDetailsModalVisible(false)}
          villa={selectedVilla}
          onEdit={handleOpenEditForm}
          onDelete={handleDeleteUnit}
        />
      ) : null}

      {/* Create / Edit Form Modal */}
      {formModalVisible ? (
        <VillaFormModal
          visible={formModalVisible}
          onClose={() => setFormModalVisible(false)}
          onSubmit={handleFormSubmit}
          editingVilla={editingVilla}
          loading={actionLoading}
        />
      ) : null}

      {/* Batch Generate Modal */}
      {batchModalVisible ? (
        <BatchGenerateModal
          visible={batchModalVisible}
          onClose={() => setBatchModalVisible(false)}
          onSubmit={async (batchData: BatchGenerateParams) => {
            await batchGenerate(batchData);
          }}
          loading={actionLoading}
        />
      ) : null}

      {/* Bulk Upload Modal */}
      {bulkUploadModalVisible ? (
        <BulkUploadVillasModal
          visible={bulkUploadModalVisible}
          onClose={() => setBulkUploadModalVisible(false)}
          onBulkUpload={async (units) => {
            await bulkUpload(units);
          }}
          onDownloadTemplate={downloadTemplate}
          loading={actionLoading}
        />
      ) : null}
    </ScreenShell>
  );
}
