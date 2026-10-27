import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, RefreshControl, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { Text } from '@/components/ui/text';
import { DraggableSpeedDial, SpeedDialAction } from '@/components/ui/DraggableSpeedDial';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FileSpreadsheet, Zap, Plus, Building2, UserPlus, Filter } from 'lucide-react-native';
import { useVilla } from '@/src/features/villa/hooks/useVilla';
import { useVillaSocket } from '@/src/features/villa/hooks/useVillaSocket';
import { useRefreshOnFocus } from '@/src/hooks/useRefreshOnFocus';
import { VillaCard } from '@/src/features/villa/components/VillaCard';
import { VillaDetailsModal } from '@/src/features/villa/components/VillaDetailsModal';
import { VillaFormModal } from '@/src/features/villa/components/VillaFormModal';
import { BatchGenerateModal } from '@/src/features/villa/components/BatchGenerateModal';
import { BulkUploadVillasModal } from '@/src/features/villa/components/BulkUploadVillasModal';
import { VillaFilterSheet } from '@/src/features/villa/components/VillaFilterSheet';
import { Villa } from '@/src/features/villa/store/villaSlice';
import { useTranslation } from '@/src/utils/i18n';

export default function VillaManagementScreen() {
  const { t } = useTranslation();
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

  useVillaSocket();

  // Local state for modals
  const [selectedVilla, setSelectedVilla] = useState<Villa | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [bulkUploadModalVisible, setBulkUploadModalVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Speed Dial Actions for DraggableSpeedDial
  const speedDialActions: SpeedDialAction[] = [
    {
      id: 'create_unit',
      label: t('create_unit', 'Create Unit'),
      icon: <Plus size={22} className="text-primary" />,
      accessibilityLabel: t('create_unit', 'Create Unit'),
      onPress: () => {
        setEditingVilla(null);
        setFormModalVisible(true);
      },
    },
    {
      id: 'bulk_upload',
      label: t('bulk_upload', 'Bulk Upload'),
      icon: <FileSpreadsheet size={22} className="text-primary" />,
      accessibilityLabel: t('bulk_upload', 'Bulk Upload'),
      onPress: () => setBulkUploadModalVisible(true),
    },
    {
      id: 'batch_generate',
      label: t('batch_generate', 'Batch Generate'),
      icon: <Zap size={22} className="text-primary" />,
      accessibilityLabel: t('batch_generate', 'Batch Generate'),
      onPress: () => setBatchModalVisible(true),
    },
  ];


  useEffect(() => {
    fetchVillas();
    fetchBlocks();
    fetchStats();
  }, []);

  // Pick up changes made on other screens (residents assigned, invites accepted) when coming back here
  useRefreshOnFocus(() => {
    fetchVillas();
    fetchBlocks();
    fetchStats();
  });

  const handleSearchChange = (text: string) => {
    setSearch(text);
    fetchVillas({ search: text, page: 1 });
  };

  const handleStatusFilter = (statusVal: string) => {
    setStatus(statusVal);
    fetchVillas({ status: statusVal, page: 1 });
  };

  const handleBlockFilter = (blockVal: string) => {
    setBlock(blockVal);
    fetchVillas({ blockOrBuilding: blockVal, page: 1 });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setBlock('');
    fetchVillas({ search: '', status: '', blockOrBuilding: '', page: 1 });
  };

  const handleOpenCreateForm = () => {
    setEditingVilla(null);
    setFormModalVisible(true);
  };

  const activeFilterCount = (filters.status ? 1 : 0) + (filters.blockOrBuilding ? 1 : 0);

  const availableStatuses = ['Vacant', 'Occupied', 'Under Maintenance', 'For Sale', 'For Rent'];
  const tabPills = ['All', 'Vacant', 'Occupied', 'Under Maintenance'];

  return (
    <ScreenShell
      title={t('unit_villa_management', 'Unit & Villa Management')}
      subtitle={t('unit_villa_management_sub', 'Configure community blocks, unit statuses, and occupants')}
      iconName="Home"
      permission="villas:read"
      error={error}
      onRetry={() => {
        fetchVillas();
        fetchStats();
      }}
      headerRight={
        <HeaderActionButton
          onPress={handleOpenCreateForm}
          icon={Plus}
          label={t('create_unit', 'Add Unit')}
          accessibilityRole="button"
          accessibilityLabel="Add Unit"
        />
      }
    >
      <View className="flex-1 bg-background">
        {/* Premium Search Filter Bar */}
        <SearchFilterBar
          searchValue={filters.search || ''}
          onSearchChange={handleSearchChange}
          searchPlaceholder={t('search_units_placeholder', 'Search by unit or block...')}
          onFilterPress={() => setFilterSheetVisible(true)}
          activeFilterCount={activeFilterCount}
        />

        {/* Premium Pill Tabs */}
        <View className="pb-3 border-b border-border/30">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerClassName="px-4 gap-2.5"
          >
            {tabPills.map((tabStatus) => {
              const isActive = tabStatus === 'All' 
                ? !filters.status
                : filters.status === tabStatus;
              
              return (
                <TouchableOpacity
                  key={tabStatus}
                  onPress={() => {
                    if (tabStatus === 'All') {
                      handleStatusFilter('');
                    } else {
                      handleStatusFilter(tabStatus);
                    }
                  }}
                  activeOpacity={0.7}
                  className={`px-4 py-1.5 rounded-full transition-colors ${
                    isActive ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <Text 
                    className={`text-[13px] font-bold tracking-tight ${
                      isActive ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {tabStatus}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List Content */}
        {villas.length === 0 && !loading ? (
          <EmptyState
            icon={Building2}
            title="No Units Found"
            description="There are no units matching your current filters."
            actionLabel="Add Unit"
            onAction={() => setFormModalVisible(true)}
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={villas}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <VillaCard
                villa={item}
                onPress={(v) => {
                  setSelectedVilla(v);
                  setDetailsModalVisible(true);
                }}
                onEdit={(v) => {
                  setEditingVilla(v);
                  setFormModalVisible(true);
                }}
              />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading && villas.length > 0}
                onRefresh={() => fetchVillas({ page: 1 })}
                colors={['#0d9488']}
                tintColor="#0d9488"
              />
            }
          />
        )}
      </View>

      {/* Physics-based Draggable Speed Dial FAB */}
      <DraggableSpeedDial
        actions={speedDialActions}
        initialBottom={24}
        initialRight={20}
        accessibilityLabel={t('villa_actions', 'Villa Actions')}
      />

      {/* Details Dialog */}
      <VillaDetailsModal
        visible={detailsModalVisible}
        onClose={() => setDetailsModalVisible(false)}
        villa={selectedVilla}
        onEdit={(v) => {
          setDetailsModalVisible(false);
          setEditingVilla(v);
          setFormModalVisible(true);
        }}
      />

      {/* Form Dialog (Create / Edit) */}
      <VillaFormModal
        visible={formModalVisible}
        onClose={() => setFormModalVisible(false)}
        onSubmit={async (data) => {
          try {
            if (editingVilla) {
              await updateUnit(editingVilla._id, data);
            } else {
              await createUnit(data);
            }
            setFormModalVisible(false);
          } catch (err: any) {
            const msg = typeof err === 'string' ? err : err?.message || 'Unit operation failed';
            Alert.alert('Unit Error', msg);
          }
        }}
        editingVilla={editingVilla}
      />

      {/* Batch Dialog */}
      <BatchGenerateModal 
        visible={batchModalVisible} 
        onClose={() => setBatchModalVisible(false)} 
        onSubmit={async (batchData) => {
          try {
            await batchGenerate(batchData);
            setBatchModalVisible(false);
          } catch (err: any) {
            const msg = typeof err === 'string' ? err : err?.message || 'Batch generation failed';
            Alert.alert('Batch Generate Error', msg);
          }
        }}
        loading={actionLoading}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadVillasModal
        visible={bulkUploadModalVisible}
        onClose={() => setBulkUploadModalVisible(false)}
        onBulkUpload={async (units) => {
          try {
            await bulkUpload(units);
            setBulkUploadModalVisible(false);
          } catch (err: any) {
            const msg = typeof err === 'string' ? err : err?.message || 'Bulk upload failed';
            Alert.alert('Bulk Upload Error', msg);
          }
        }}
        onDownloadTemplate={downloadTemplate}
        loading={actionLoading}
      />

      {/* Villa Filter Sheet */}
      <VillaFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        availableStatuses={availableStatuses}
        selectedStatus={filters.status}
        onSelectStatus={handleStatusFilter}
        availableBlocks={blocks}
        selectedBlock={filters.blockOrBuilding}
        onSelectBlock={handleBlockFilter}
        onClearAll={handleClearFilters}
      />
    </ScreenShell>
  );
}
