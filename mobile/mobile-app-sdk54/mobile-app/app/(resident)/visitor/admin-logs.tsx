import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { ExportReportButton } from '@/components/analytics/ExportReportButton';
import { AdminGateLogCard, AdminGateLogItem } from '@/src/features/visitor/components/admin/AdminGateLogCard';
import { AdminForceCheckoutModal } from '@/src/features/visitor/components/admin/AdminForceCheckoutModal';
import { VisitorLogDetailsModal } from '@/src/features/visitor/components/history/VisitorLogDetailsModal';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { mapBackendPassToHistoryItem } from '@/src/features/visitor/utils/mapBackendPassToHistoryItem';

export default function AdminGateLogsScreen() {
  const {
    communityPasses,
    pagination,
    status,
    actionStatus,
    error,
    loadCommunityPasses,
    forceCheckout,
  } = useAdminVisitor();

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AdminGateLogItem | null>(null);
  const [selectedPassForModal, setSelectedPassForModal] = useState<any | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = useCallback(
    (page: number, append: boolean = false) => {
      const params: any = {
        page,
        limit: 10,
        append,
      };
      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      return loadCommunityPasses(params);
    },
    [loadCommunityPasses, activeTab]
  );

  useEffect(() => {
    loadData(1, false);
  }, [activeTab, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1, false);
    setRefreshing(false);
  }, [loadData]);

  const handleLoadMore = useCallback(async () => {
    if (
      status === 'loading' ||
      loadingMore ||
      refreshing ||
      pagination.currentPage >= pagination.totalPages
    ) {
      return;
    }
    setLoadingMore(true);
    await loadData(pagination.currentPage + 1, true);
    setLoadingMore(false);
  }, [status, loadingMore, refreshing, pagination, loadData]);

  const mappedLogs: AdminGateLogItem[] = useMemo(() => {
    if (!Array.isArray(communityPasses)) return [];
    return communityPasses.map((pass: any) => ({
      _id: pass._id || pass.id,
      visitorName: pass.visitorName || pass.visitorDetails?.fullName || 'Visitor',
      phone: pass.phone || pass.visitorDetails?.phone,
      passType: pass.passType || pass.category || 'GUEST',
      category: pass.category || pass.passType,
      code: pass.shortKey || pass.code,
      shortKey: pass.shortKey || pass.code,
      vehicleNo: pass.vehicleNo || pass.vehicleDetails?.plateNumber,
      villaNumber: pass.villaNumber || pass.unitNumber || pass.destinationUnit,
      guardName: pass.guardName || pass.approvedByName || 'Gate Security',
      gateName: pass.gateName || 'Main Security Gate',
      entryTime: pass.entryTime || pass.validFrom || pass.createdAt,
      exitTime: pass.exitTime || pass.validUntil,
      status: pass.status || 'ACTIVE',
      isBlacklisted: Boolean(pass.isBlacklisted),
      purpose: pass.purpose,
      provider: pass.provider || pass.serviceCategory,
      rawPass: pass,
    }));
  }, [communityPasses]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return mappedLogs;
    const query = search.toLowerCase().trim();
    return mappedLogs.filter((log) => {
      const matchName = log.visitorName ? log.visitorName.toLowerCase().includes(query) : false;
      const matchCode = log.shortKey ? log.shortKey.toLowerCase().includes(query) : false;
      const matchVehicle = log.vehicleNo ? log.vehicleNo.toLowerCase().includes(query) : false;
      const matchVilla = log.villaNumber ? log.villaNumber.toLowerCase().includes(query) : false;
      const matchGuard = log.guardName ? log.guardName.toLowerCase().includes(query) : false;
      const matchPhone = log.phone ? log.phone.includes(query) : false;
      return matchName || matchCode || matchVehicle || matchVilla || matchGuard || matchPhone;
    });
  }, [mappedLogs, search]);

  const handleOpenForceCheckout = (log: AdminGateLogItem) => {
    setSelectedLog(log);
    setCheckoutModalOpen(true);
  };

  const handleConfirmForceCheckout = async (reason: string) => {
    if (selectedLog?._id) {
      await forceCheckout(selectedLog._id, reason);
      setCheckoutModalOpen(false);
      setSelectedLog(null);
      loadData(1, false);
    }
  };

  const handleOpenDetails = (log: AdminGateLogItem) => {
    if (log.rawPass) {
      setSelectedPassForModal(mapBackendPassToHistoryItem(log.rawPass));
      setDetailsModalOpen(true);
    }
  };

  const handleExportCSV = () => {
    console.log('[Admin Gate Logs] Exporting CSV Report...');
  };

  const renderHeader = () => (
    <View className="gap-3 mb-3">
      {/* Real-Time Keyword Search Bar & Moveable Slide Status Filter */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search visitor, vehicle plate, guard or villa..."
        sortOptions={[
          { label: 'All Logs', value: 'ALL' },
          { label: 'Inside Now', value: 'ACTIVE' },
          { label: 'Completed', value: 'EXPIRED' },
          { label: 'Revoked/Denied', value: 'REVOKED' },
        ]}
        currentSort={activeTab}
        onSortChange={(tabKey) => {
          setSearch('');
          setActiveTab(tabKey);
        }}
        variant="default"
        className="px-0 py-0 border-0"
      />

      {/* Error notification banner with retry */}
      {status === 'failed' && error && (
        <ErrorBanner
          message={error}
          onRetry={() => loadData(1, false)}
          className="my-1"
        />
      )}
    </View>
  );

  return (
    <ScreenShell
      title="Admin Gate Audit Logs"
      subtitle="Complete community entry/exit logs & timestamp security audit"
      iconName="ShieldCheck"
      headerRight={
        <ExportReportButton onExport={handleExportCSV} />
      }
    >
      <View className="flex-1 bg-background">
        {/* Virtualized Paginated Audit Log Feed */}
        <PaginatedList<AdminGateLogItem>
          data={filteredLogs}
          pagination={{
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            totalRecords: pagination.totalRecords,
            limit: pagination.limit,
          }}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          loading={status === 'loading' && !refreshing && !loadingMore && communityPasses.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="ClipboardList"
          emptyTitle="No Audit Logs Found"
          emptySubtitle="No visitor entry/exit records match your filter criteria."
          contentContainerClassName="px-4 pt-2 pb-28"
          renderItem={(log) => (
            <AdminGateLogCard
              key={log._id}
              log={log}
              onForceCheckout={handleOpenForceCheckout}
              onPress={handleOpenDetails}
            />
          )}
        />
      </View>

      {/* Admin Force Checkout Confirmation Modal */}
      <AdminForceCheckoutModal
        visible={checkoutModalOpen}
        visitorName={selectedLog?.visitorName}
        loading={actionStatus === 'loading'}
        onClose={() => {
          setCheckoutModalOpen(false);
          setSelectedLog(null);
        }}
        onConfirm={handleConfirmForceCheckout}
      />

      {/* Full Pass Detail Inspector Modal */}
      <VisitorLogDetailsModal
        visible={detailsModalOpen}
        pass={selectedPassForModal}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPassForModal(null);
        }}
      />
    </ScreenShell>
  );
}
