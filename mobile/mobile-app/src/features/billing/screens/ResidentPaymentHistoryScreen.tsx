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
import { useTranslation } from '@/src/utils/i18n';

export function ResidentPaymentHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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

  const filterPills = useMemo(
    () => [
      { key: 'ALL', label: t('all_history', 'All History') },
      { key: 'PAID', label: t('paid', 'Paid') },
      { key: 'PARTIALLY_PAID', label: t('partial', 'Partial') },
      { key: 'VERIFICATION_PENDING', label: t('pending_clearance', 'Pending Clearance') },
      { key: 'UNPAID', label: t('unpaid', 'Unpaid') },
    ],
    [t]
  );

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
      title={t('payment_history', 'Payment History')}
      subtitle={t('payment_history_sub', 'View your past settled maintenance fees & receipts')}
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
        onLoadMore={handleRefresh}
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
                tabs={filterPills}
                activeTab={statusFilter}
                onTabChange={setStatusFilter}
                variant="pill"
              />
            </View>
          </View>
        }
        emptyIcon="Receipt"
        emptyTitle={t('no_payment_history_found', 'No Payment History Found')}
        emptySubtitle={
          statusFilter === 'ALL'
            ? t('no_payment_history_desc', 'You currently have no historical billing payment records.')
            : `${t('no_invoices_matching_filter', 'No invoice records match status filter')} "${statusFilter.replace(/_/g, ' ')}".`
        }
        contentContainerClassName="px-4 pt-3 pb-28"
      />
    </ScreenShell>
  );
}

export default ResidentPaymentHistoryScreen;
