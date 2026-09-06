import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/common/Button';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { ShieldAlert } from 'lucide-react-native';
import { InvoiceCard } from '../components/InvoiceCard';
import { InvoiceActionsBottomSheet } from '../components/InvoiceActionsBottomSheet';
import { AdminOfflineSettleSheet } from '../components/AdminOfflineSettleSheet';
import { LedgerQRScannerModal } from '../components/LedgerQRScannerModal';
import { LedgerFilterDrawer, LedgerFilterValues } from '../components/LedgerFilterDrawer';
import { LedgerGroupingToggle, LedgerGroupingMode } from '../components/LedgerGroupingToggle';
import { UnitLedgerGroupCard } from '../components/grouping/UnitLedgerGroupCard';
import { ResidentLedgerGroupCard } from '../components/grouping/ResidentLedgerGroupCard';
import { CycleLedgerGroupCard } from '../components/grouping/CycleLedgerGroupCard';
import { Invoice } from '../types';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';

export function BillingLedgerScreen() {
  const router = useRouter();
  const {
    invoicesList,
    statusCounts,
    pagination,
    loadingStates,
    error,
    activeOrgId,
    changeTablePage,
    approveOffline,
    rejectOffline,
    resetBillingError,
  } = useBilling();

  // Socket sync for real-time ledger updates
  useBillingSocket();

  // Permission check from auth state (memoized boolean selector to avoid new reference warnings)
  const hasLedgerPermission = useSelector((state: any) => {
    const role = state.auth?.user?.role || '';
    if (role === 'SuperAdmin' || role === 'Admin') return true;
    const permissions = state.auth?.user?.permissions;
    if (!Array.isArray(permissions)) return false;
    return (
      permissions.includes('billing:dashboard') ||
      permissions.includes('billing:assessment_manager') ||
      permissions.includes('*')
    );
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [groupMode, setGroupMode] = useState<LedgerGroupingMode>('flat');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [settleInvoice, setSettleInvoice] = useState<Invoice | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Advanced filters state
  const [activeFilters, setActiveFilters] = useState<LedgerFilterValues>({
    startDate: '',
    endDate: '',
    datePreset: 'ALL_TIME',
    block: 'ALL',
    paymentMethod: 'ALL',
  });

  // Calculate active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.startDate || activeFilters.endDate) count++;
    if (activeFilters.block && activeFilters.block !== 'ALL') count++;
    if (activeFilters.paymentMethod && activeFilters.paymentMethod !== 'ALL') count++;
    return count;
  }, [activeFilters]);

  // Combined query params object
  const currentQueryParams = useMemo(() => ({
    search,
    status: statusFilter,
    startDate: activeFilters.startDate || undefined,
    endDate: activeFilters.endDate || undefined,
    block: activeFilters.block !== 'ALL' ? activeFilters.block : undefined,
    paymentMethod: activeFilters.paymentMethod !== 'ALL' ? activeFilters.paymentMethod : undefined,
    groupBy: groupMode === 'flat' ? 'none' : groupMode,
  }), [search, statusFilter, activeFilters, groupMode]);

  // Dynamic status pill options with live count badges
  const statusSortOptions = useMemo(() => [
    { label: `All (${statusCounts?.ALL ?? 0})`, value: 'ALL' },
    { label: `⚠️ Pending (${statusCounts?.VERIFICATION_PENDING ?? 0})`, value: 'VERIFICATION_PENDING' },
    { label: `❌ Overdue (${statusCounts?.OVERDUE ?? 0})`, value: 'OVERDUE' },
    { label: `Unpaid (${statusCounts?.UNPAID ?? 0})`, value: 'UNPAID' },
    { label: `Partial (${statusCounts?.PARTIALLY_PAID ?? 0})`, value: 'PARTIALLY_PAID' },
    { label: `✅ Paid (${statusCounts?.PAID ?? 0})`, value: 'PAID' },
  ], [statusCounts]);

  // Trigger server-side query when status filter, advanced filters, grouping mode, or active organization changes
  useEffect(() => {
    if (hasLedgerPermission) {
      changeTablePage(1, currentQueryParams);
    }
  }, [statusFilter, activeFilters, groupMode, hasLedgerPermission, activeOrgId]);

  // Debounced search trigger (300ms)
  useEffect(() => {
    if (!hasLedgerPermission) return;
    const timer = setTimeout(() => {
      changeTablePage(1, currentQueryParams);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, hasLedgerPermission, activeOrgId]);

  const handleRefresh = useCallback(() => {
    changeTablePage(1, currentQueryParams);
  }, [changeTablePage, currentQueryParams]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages && !loadingStates.fetchGrid) {
      changeTablePage(pagination.currentPage + 1, currentQueryParams);
    }
  }, [changeTablePage, pagination, currentQueryParams, loadingStates.fetchGrid]);

  // Differentiated Empty Subtitles (Must be declared before any conditional return)
  const emptySubtitle = useMemo(() => {
    if (search.trim()) return `No billing records match "${search.trim()}".`;
    if (statusFilter !== 'ALL') return `No invoices match status filter "${statusFilter.replace(/_/g, ' ')}".`;
    return 'No community billing records found in the ledger.';
  }, [search, statusFilter]);

  // Guaranteed unique key extractor for FlatList across all ledger modes
  const ledgerKeyExtractor = useCallback((item: any, index: number): string => {
    if (!item) return `ledger-item-${index}`;
    if (groupMode === 'cycle') {
      const period = item.billingPeriodString || (typeof item._id === 'object' ? item._id?.period : '') || '';
      const assess = item.assessmentName || (typeof item._id === 'object' ? item._id?.assessmentId : '') || '';
      return `cycle-${period}-${assess}-${index}`;
    }
    if (groupMode === 'unit') {
      const unit = item.unitNumber || item.unitId || (typeof item._id === 'string' ? item._id : '') || '';
      return `unit-${unit}-${index}`;
    }
    if (groupMode === 'resident') {
      const resident = item.residentName || item.residentId || (typeof item._id === 'string' ? item._id : '') || '';
      return `resident-${resident}-${index}`;
    }
    if (typeof item._id === 'string' && item._id) return item._id;
    if (item.invoiceNumber) return String(item.invoiceNumber);
    if (typeof item.id === 'string' && item.id) return item.id;
    return `invoice-${index}`;
  }, [groupMode]);

  return (
    <ScreenShell
      title="Billing Ledger"
      subtitle={
        !hasLedgerPermission
          ? 'Access Restricted'
          : `Total ${pagination.totalRecords || 0} community invoices`
      }
      iconName="Receipt"
      loading={hasLedgerPermission && loadingStates.fetchGrid && invoicesList.length === 0}
    >
      {!hasLedgerPermission ? (
        <View className="flex-1 bg-background p-6 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-destructive/10 items-center justify-center mb-4">
            <Icon as={ShieldAlert} size={32} className="text-destructive" />
          </View>
          <Text className="text-xl font-bold text-foreground text-center mb-2">Access Denied</Text>
          <Text className="text-sm text-muted-foreground text-center mb-6 px-4">
            You do not have the required administrative permission (<Text className="font-mono text-xs font-bold">billing:dashboard</Text>) to inspect community ledgers.
          </Text>
          <Button
            variant="default"
            size="lg"
            onPress={() => router.push('/(resident)/billing/my-dues' as any)}
            accessibilityRole="button"
            accessibilityLabel="Return to My Dues"
          >
            Return to My Dues
          </Button>
        </View>
      ) : (
        <View className="flex-1 bg-background">
          {/* Error Banner */}
          {error ? (
            <View className="px-4 pt-2">
              <ErrorBanner message={error} onDismiss={resetBillingError} />
            </View>
          ) : null}

          {/* Unified Filter Pills (Row 2) & Search Input with Scanner & Filter Drawer trigger (Row 1) */}
          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search unit 'Villa 104', Chq #, or resident..."
            sortOptions={statusSortOptions}
            currentSort={statusFilter}
            onSortChange={(val) => setStatusFilter(val as any)}
            onScanPress={() => setShowScanner(true)}
            onFilterPress={() => setShowFilterDrawer(true)}
            activeFilterCount={activeFilterCount}
          />

          {/* Multi-Mode Grouping Toggle (Row 4) */}
          <LedgerGroupingToggle
            mode={groupMode}
            onModeChange={setGroupMode}
          />

          {/* Paginated Cards List (Flat or Grouped View) */}
          <PaginatedList<any>
            data={invoicesList}
            keyExtractor={ledgerKeyExtractor}
          renderItem={(item) => {
            if (groupMode === 'unit') {
              return (
                <UnitLedgerGroupCard
                  key={item._id || item.unitNumber}
                  unitGroup={item}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                />
              );
            }
            if (groupMode === 'resident') {
              return (
                <ResidentLedgerGroupCard
                  key={item._id || item.residentName}
                  residentGroup={item}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                />
              );
            }
            if (groupMode === 'cycle') {
              return (
                <CycleLedgerGroupCard
                  key={`${item.billingPeriodString}_${item.assessmentName}`}
                  cycleGroup={item}
                  onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                />
              );
            }
            return (
              <InvoiceCard
                key={item._id || item.invoiceNumber}
                invoice={item}
                onPress={() => setSelectedInvoice(item)}
              />
            );
          }}
          pagination={pagination}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          loading={loadingStates.fetchGrid}
          emptyIcon="Receipt"
          emptyTitle="No Records Found"
          emptySubtitle={emptySubtitle}
          contentContainerClassName="px-4 py-2"
        />

        {/* Advanced Filter Drawer */}
        <LedgerFilterDrawer
          visible={showFilterDrawer}
          onClose={() => setShowFilterDrawer(false)}
          filters={activeFilters}
          onApply={(newFilters) => setActiveFilters(newFilters)}
          onReset={() =>
            setActiveFilters({
              startDate: '',
              endDate: '',
              datePreset: 'ALL_TIME',
              block: 'ALL',
              paymentMethod: 'ALL',
            })
          }
        />

        {/* Hardware QR / Barcode Scanner Modal */}
        <LedgerQRScannerModal
          visible={showScanner}
          onClose={() => setShowScanner(false)}
          onScanCode={(scannedCode) => {
            setSearch(scannedCode);
            setShowScanner(false);
          }}
        />

        {/* Quick Actions / Review Details BottomSheet */}
        <InvoiceActionsBottomSheet
          visible={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          onApproveOffline={approveOffline}
          onRejectOffline={rejectOffline}
          onSettleOfflineModal={(inv) => setSettleInvoice(inv)}
        />

        {/* Admin Offline Payment Settlement Sheet */}
        <AdminOfflineSettleSheet
          visible={!!settleInvoice}
          onClose={() => setSettleInvoice(null)}
          invoice={settleInvoice}
          onSuccess={() => {
            changeTablePage(pagination?.currentPage || 1, currentQueryParams);
          }}
        />
      </View>
      )}
    </ScreenShell>
  );
}

export default BillingLedgerScreen;
