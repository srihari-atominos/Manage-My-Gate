import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { TabBar } from '@/components/ui/TabBar';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import { PaymentReceiptCard } from '../components/PaymentReceiptCard';

const FILTER_PILLS = [
  { key: 'ALL', label: 'All History' },
  { key: 'PAID', label: 'Paid' },
  { key: 'PARTIALLY_PAID', label: 'Partial' },
  { key: 'VERIFICATION_PENDING', label: 'Pending Clearance' },
  { key: 'UNPAID', label: 'Unpaid' },
];

export function ResidentPaymentHistoryScreen() {
  const router = useRouter();
  const {
    activeDues,
    loadingStates,
    error,
    loadResidentDues,
    resetBillingError,
  } = useBilling();

  // Socket listener for real-time invoice status updates
  useBillingSocket();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  const handleRefresh = useCallback(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  // Extract recentInvoices array from activeDues
  const recentInvoices: any[] = useMemo(() => {
    return activeDues?.recentInvoices || [];
  }, [activeDues]);

  // Filter invoices by selected status pill
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'ALL') return recentInvoices;
    if (statusFilter === 'PARTIALLY_PAID') {
      return recentInvoices.filter(
        (inv) => inv.status === 'PARTIALLY_PAID' || (inv.paidAmount > 0 && inv.paidAmount < (inv.totalDue || inv.amount))
      );
    }
    return recentInvoices.filter((inv) => inv.status === statusFilter);
  }, [recentInvoices, statusFilter]);

  const handleViewInvoiceDetails = (invoiceId: string) => {
    if (!invoiceId) return;
    router.push(`/(resident)/billing/invoice/${invoiceId}` as any);
  };

  return (
    <ScreenShell
      title="Payment History"
      subtitle="View your past settled maintenance fees & receipts"
      iconName="Receipt"
      loading={loadingStates.fetchDues && recentInvoices.length === 0}
    >
      {/* Invoice Payment History Card List with TabBar in ListHeaderComponent */}
      <PaginatedList<any>
        data={filteredInvoices}
        renderItem={(inv: any) => (
          <PaymentReceiptCard
            key={inv.invoiceId || inv._id || inv.id}
            invoice={inv}
            onViewDetails={handleViewInvoiceDetails}
            className="mb-2.5"
          />
        )}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          totalRecords: filteredInvoices.length,
          limit: 50,
        }}
        onLoadMore={() => {}}
        onRefresh={handleRefresh}
        loading={loadingStates.fetchDues}
        ListHeaderComponent={
          <View className="gap-2 mb-3">
            {/* Error Banner Container */}
            {error ? (
              <ErrorBanner
                message={error}
                onDismiss={() => {
                  resetBillingError();
                }}
              />
            ) : null}

            {/* Canonical TabBar: Filter Pills */}
            <View className="bg-card border border-border rounded-2xl p-1 shadow-xs">
              <TabBar
                tabs={FILTER_PILLS}
                activeTab={statusFilter}
                onTabChange={setStatusFilter}
                variant="pill"
              />
            </View>
          </View>
        }
        emptyIcon="Receipt"
        emptyTitle="No Payment History Found"
        emptySubtitle={
          statusFilter === 'ALL'
            ? 'You currently have no historical billing payment records.'
            : `No invoice records match status filter "${statusFilter.replace(/_/g, ' ')}".`
        }
        contentContainerClassName="px-4 pt-3 pb-28"
      />
    </ScreenShell>
  );
}

export default ResidentPaymentHistoryScreen;
