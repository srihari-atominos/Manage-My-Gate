import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/ui/KPICard';
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
    kpis,
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

  // Permission check from auth state
  const permissions: string[] = useSelector((state: any) => state.auth?.user?.permissions || []);
  const userRole: string = useSelector((state: any) => state.auth?.user?.role || '');
  const isSuperAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
  const hasLedgerPermission = isSuperAdmin || permissions.includes('billing:dashboard') || permissions.includes('billing:assessment_manager') || permissions.includes('*');

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

  // Permission Denied View
  if (!hasLedgerPermission) {
    return (
      <ScreenShell title="Billing Ledger" subtitle="Access Restricted" iconName="Receipt">
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
      </ScreenShell>
    );
  }

  // Differentiated Empty Subtitles
  const emptySubtitle = useMemo(() => {
    if (search.trim()) return `No billing records match "${search.trim()}".`;
    if (statusFilter !== 'ALL') return `No invoices match status filter "${statusFilter.replace(/_/g, ' ')}".`;
    return 'No community billing records found in the ledger.';
  }, [search, statusFilter]);

  return (
    <ScreenShell
      title="Billing Ledger"
      subtitle={`Total ${pagination.totalRecords || 0} community invoices`}
      iconName="Receipt"
      loading={loadingStates.fetchGrid && invoicesList.length === 0}
    >
      <View className="flex-1 bg-background">

        {/* Paginated Invoice Cards List with All Controls in ListHeaderComponent */}
        <PaginatedList<Invoice>
          data={invoicesList}
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
          ListHeaderComponent={
            <View className="gap-2.5 mb-3">
              {/* Error Banner */}
              {error ? (
                <ErrorBanner message={error} onDismiss={resetBillingError} />
              ) : null}

              {/* Financial KPI Summary Cards */}
              <View className="flex-row gap-2.5">
                <KPICard
                  title="Total Invoiced"
                  value={
                    kpis?.grossDemand
                      ? `₹${kpis.grossDemand.toLocaleString('en-IN')}`
                      : String(pagination.totalRecords || invoicesList.length)
                  }
                  iconName="Receipt"
                  iconColor="#3b82f6"
                  className="flex-1"
                />
                <KPICard
                  title="Total Collected"
                  value={
                    kpis?.totalCollected
                      ? `₹${kpis.totalCollected.toLocaleString('en-IN')}`
                      : `${invoicesList.filter((i: any) => i.status === 'PAID').length} Paid`
                  }
                  iconName="TrendingUp"
                  iconColor="#10b981"
                  className="flex-1"
                />
                <KPICard
                  title="Pending Arrears"
                  value={
                    kpis?.totalUnpaidArrears
                      ? `₹${kpis.totalUnpaidArrears.toLocaleString('en-IN')}`
                      : `${invoicesList.filter((i: any) => ['UNPAID', 'OVERDUE', 'VERIFICATION_PENDING'].includes(i.status)).length} Due`
                  }
                  iconName="Clock"
                  iconColor="#f59e0b"
                  className="flex-1"
                />
              </View>

              {/* Search Header */}
              <SearchFilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search resident, unit, or invoice number..."
              />

              {/* Filter Pills Row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {FILTER_PILLS.map((pill) => {
                  const isActive = statusFilter === pill.id;
                  return (
                    <Pressable
                      key={pill.id}
                      onPress={() => setStatusFilter(pill.id)}
                      className={`px-3.5 py-1.5 rounded-full border ${
                        isActive
                          ? 'bg-primary border-primary'
                          : 'bg-muted border-border'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${pill.label}`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {pill.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          }
          emptyIcon="Receipt"
          emptyTitle="No Invoices Found"
          emptySubtitle={emptySubtitle}
          contentContainerClassName="px-4 pt-3 pb-28"
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
    </ScreenShell>
  );
}

export default BillingLedgerScreen;
