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
import { OfflineSettleSheet } from '../components/OfflineSettleSheet';
import { Invoice } from '../types';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';

const FILTER_PILLS = [
  { id: 'ALL', label: 'All' },
  { id: 'VERIFICATION_PENDING', label: 'Pending Clearance' },
  { id: 'UNPAID', label: 'Unpaid' },
  { id: 'PARTIALLY_PAID', label: 'Partial' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'PAID', label: 'Paid' },
];

export function BillingLedgerScreen() {
  const router = useRouter();
  const {
    invoicesList,
    pagination,
    loadingStates,
    error,
    changeTablePage,
    approveOffline,
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [settleInvoice, setSettleInvoice] = useState<Invoice | null>(null);

  // Trigger server-side query when status filter changes
  useEffect(() => {
    if (hasLedgerPermission) {
      changeTablePage(1, { search, status: statusFilter });
    }
  }, [statusFilter, hasLedgerPermission]);

  // Debounced search trigger (300ms)
  useEffect(() => {
    if (!hasLedgerPermission) return;
    const timer = setTimeout(() => {
      changeTablePage(1, { search, status: statusFilter });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, hasLedgerPermission]);

  const handleRefresh = useCallback(() => {
    changeTablePage(1, { search, status: statusFilter });
  }, [changeTablePage, search, statusFilter]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages && !loadingStates.fetchGrid) {
      changeTablePage(pagination.currentPage + 1, { search, status: statusFilter });
    }
  }, [changeTablePage, pagination, search, statusFilter, loadingStates.fetchGrid]);

  // Differentiated Empty Subtitles (Must be declared before any conditional return)
  const emptySubtitle = useMemo(() => {
    if (search.trim()) return `No billing records match "${search.trim()}".`;
    if (statusFilter !== 'ALL') return `No invoices match status filter "${statusFilter.replace(/_/g, ' ')}".`;
    return 'No community billing records found in the ledger.';
  }, [search, statusFilter]);

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

          {/* Unified Filter Pills (Row 1) & Search Input (Row 2) */}
          <View className="px-4 pt-3 pb-1">
            <SearchFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search resident, unit, or invoice number..."
              sortOptions={FILTER_PILLS.map((p) => ({ label: p.label, value: p.id }))}
              currentSort={statusFilter}
              onSortChange={(val) => setStatusFilter(val as any)}
              variant="default"
              className="px-0 py-0 border-0"
            />
          </View>

          {/* Paginated Invoice Cards List */}
          <PaginatedList<Invoice>
            data={invoicesList}
            keyExtractor={(inv, index) => inv._id || inv.invoiceNumber || `inv-${index}`}
            renderItem={(inv) => (
              <InvoiceCard
                key={inv._id || inv.invoiceNumber}
                invoice={inv}
                onPress={() => setSelectedInvoice(inv)}
              />
            )}
            pagination={pagination}
            onLoadMore={handleLoadMore}
            onRefresh={handleRefresh}
            loading={loadingStates.fetchGrid}
            emptyIcon="Receipt"
            emptyTitle="No Invoices Found"
            emptySubtitle={emptySubtitle}
            contentContainerClassName="px-4 py-2"
          />

          {/* Quick Actions / Review Details BottomSheet */}
          <InvoiceActionsBottomSheet
            visible={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            invoice={selectedInvoice}
            onApproveOffline={approveOffline}
            onSettleOfflineModal={(inv) => setSettleInvoice(inv)}
          />

          {/* Offline Payment Settlement Sheet */}
          <OfflineSettleSheet
            visible={!!settleInvoice}
            onClose={() => setSettleInvoice(null)}
            invoice={settleInvoice}
          />
        </View>
      )}
    </ScreenShell>
  );
}

export default BillingLedgerScreen;
