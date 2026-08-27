import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ListCard } from '@/components/ui/ListCard';
import { KPICard } from '@/components/ui/KPICard';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSecurityLogs } from '../../../src/features/amenities/hooks/useSecurityLogs';
import { SecurityLogDetailModal } from '../../../src/features/amenities/components/SecurityLogDetailModal';
import { SecurityLog } from '../../../src/features/amenities/services/securityLogApi';

export default function AmenitySecurityLogsScreen() {
  const {
    logs,
    dashboard,
    pagination,
    filters,
    loading,
    error,
    loadData,
    handleFilterChange,
    handlePageChange,
    handleClearFilters,
  } = useSecurityLogs();

  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);

  const scanTypeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Entry', value: 'Entry' },
    { label: 'Exit', value: 'Exit' },
    { label: 'Denied', value: 'Denied' },
    { label: 'Manual', value: 'Manual Verification' },
  ];

  const activeVisitors = Math.max(0, (dashboard?.entries || 0) - (dashboard?.exits || 0));

  const renderSecurityLogItem = (item: SecurityLog) => {
    const isDenied = item.status === 'Denied' || item.scanType === 'Denied';
    const isExit = item.scanType === 'Exit';

    const statusLabel = isDenied
      ? 'DENIED'
      : isExit
      ? 'EXIT'
      : item.scanType === 'Manual Verification'
      ? 'MANUAL'
      : 'ENTRY';

    const statusVariant = isDenied
      ? 'danger'
      : isExit
      ? 'info'
      : item.scanType === 'Manual Verification'
      ? 'warning'
      : 'success';

    const scanTimeFormatted = item.scanTime
      ? new Date(item.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '-';

    return (
      <View className="mb-2">
        <ListCard
          title={item.amenityName || 'Amenity Gate Access'}
          subtitle={`Resident: ${item.residentName || 'Resident'} • Guard: ${item.guardName || 'System'} • ${scanTimeFormatted}`}
          leftIcon={isDenied ? 'ShieldAlert' : isExit ? 'DoorClosed' : 'DoorOpen'}
          leftIconBgColor={isDenied ? '#fee2e2' : isExit ? '#e0f2fe' : '#dcfce7'}
          leftIconColor={isDenied ? '#dc2626' : isExit ? '#0284c7' : '#16a34a'}
          onPress={() => setSelectedLog(item)}
          status={{
            label: statusLabel,
            variant: statusVariant,
          }}
        />
      </View>
    );
  };

  return (
    <ScreenShell
      title="Security Audit Logs"
      subtitle="Gate scanner verification audit logs & real-time entry history"
      iconName="ClipboardList"
      loading={loading && logs.length === 0}
      error={error}
      onRetry={loadData}
    >
      <View className="flex-1 px-3 pt-2">
        {/* Responsive 2x2 Grid KPI Cards (Aligned & Compact) */}
        <View className="flex-row flex-wrap justify-between gap-y-2.5 mb-3">
          <View style={{ width: '48.5%' }}>
            <KPICard
              title="Today's Entries"
              value={dashboard?.entries || 0}
              iconName="DoorOpen"
              iconColor="#10b981"
              className="w-full"
            />
          </View>
          <View style={{ width: '48.5%' }}>
            <KPICard
              title="Today's Exits"
              value={dashboard?.exits || 0}
              iconName="DoorClosed"
              iconColor="#0284c7"
              className="w-full"
            />
          </View>
          <View style={{ width: '48.5%' }}>
            <KPICard
              title="Denied Access"
              value={dashboard?.denied || 0}
              iconName="ShieldAlert"
              iconColor="#ef4444"
              className="w-full"
            />
          </View>
          <View style={{ width: '48.5%' }}>
            <KPICard
              title="Active Visitors"
              value={activeVisitors}
              iconName="Users"
              iconColor="#8b5cf6"
              className="w-full"
            />
          </View>
        </View>

        {/* Compact Search & Filter Bar */}
        <View className="bg-card p-3 rounded-xl border border-border/80 mb-3 gap-2.5 shadow-sm">
          <TextInput
            value={filters.search}
            onChangeText={(text) => handleFilterChange('search', text)}
            placeholder="Search resident, amenity, guard..."
          />

          {/* Scan Type Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {scanTypeOptions.map((opt) => {
              const isSelected = filters.scanType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => handleFilterChange('scanType', opt.value)}
                  className={`px-3 py-1 rounded-full border me-2 ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {Boolean(filters.search || filters.scanType) && (
            <Button
              variant="outline"
              size="sm"
              onPress={handleClearFilters}
              className="self-end py-1 h-8"
            >
              <Text className="text-xs font-medium">Clear Filters</Text>
            </Button>
          )}
        </View>

        {/* Paginated Audit Log List */}
        <PaginatedList
          data={logs}
          renderItem={renderSecurityLogItem}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalRecords: pagination.total,
            limit: pagination.limit,
          }}
          onLoadMore={() => {
            if (pagination.page < pagination.totalPages) {
              handlePageChange(pagination.page + 1);
            }
          }}
          onRefresh={loadData}
          loading={loading}
          emptyIcon="ClipboardList"
          emptyTitle="No Security Logs Found"
          emptySubtitle="No gate scanner audit events match your current filter parameters."
          contentContainerClassName="pb-6"
        />
      </View>

      {/* Log Detail Drawer Modal */}
      <SecurityLogDetailModal
        visible={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </ScreenShell>
  );
}
