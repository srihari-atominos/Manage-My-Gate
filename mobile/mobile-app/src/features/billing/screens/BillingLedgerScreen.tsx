import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { ScreenShell, SearchFilterBar, TabBar } from '@/components/ui';
import { ErrorBanner, SuccessToast } from '@/components/feedback';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import {
  InvoiceLedgerList,
  InvoiceDetailBottomSheet,
  PaymentMethodBottomSheet,
  OfflineSettlementModal,
} from '../components';
import { Invoice } from '../store/billingSlice';

export const BillingLedgerScreen: React.FC = () => {
  const {
    invoices,
    pagination,
    loadingStates,
    error,
    fetchInvoices,
    payWithWallet,
    settleOffline,
    clearError,
  } = useBilling();

  // Attach WebSocket listener for real-time invoice updates
  useBillingSocket();

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadGridData = useCallback(
    (page: number = 1) => {
      const filters: any = {};
      if (activeTab !== 'ALL') {
        filters.status = activeTab;
      }
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      fetchInvoices(page, pagination.limit || 10, filters);
    },
    [activeTab, searchQuery, fetchInvoices, pagination.limit]
  );

  useEffect(() => {
    loadGridData(1);
  }, [loadGridData]);

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailSheet(true);
  };

  const handleSelectPaymentMethod = async (method: 'WALLET' | 'RAZORPAY' | 'OFFLINE') => {
    setShowPaymentSheet(false);
    if (!selectedInvoice) return;

    if (method === 'WALLET') {
      try {
        await payWithWallet(selectedInvoice._id);
        setSuccessMessage('Invoice paid successfully via wallet!');
        loadGridData(1);
      } catch (err) {}
    } else if (method === 'OFFLINE') {
      setShowOfflineModal(true);
    }
  };

  const handleSubmitOffline = async (payload: { offlineReference: string; paymentMethod: string }) => {
    setShowOfflineModal(false);
    if (!selectedInvoice) return;
    try {
      await settleOffline(selectedInvoice._id, payload.offlineReference, payload.paymentMethod);
      setSuccessMessage('Offline reference recorded. Awaiting admin approval.');
      loadGridData(1);
    } catch (err) {}
  };

  const filterTabs = [
    { key: 'ALL', label: 'All Invoices' },
    { key: 'UNPAID', label: 'Unpaid' },
    { key: 'PAID', label: 'Paid' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'VERIFICATION_PENDING', label: 'Pending Approval' },
  ];

  return (
    <ScreenShell
      title="Billing & Invoice Ledger"
      subtitle="View all historical invoices, receipts, and payment status"
      iconName="FileText"
      loading={loadingStates.fetchGrid && invoices.length === 0}
    >
      <View className="space-y-3 flex-1">
        {error && <ErrorBanner message={error} onDismiss={clearError} />}
        {successMessage && (
          <SuccessToast
            message={successMessage}
            visible={Boolean(successMessage)}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}

        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by invoice # or unit..."
        />

        <TabBar
          tabs={filterTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <InvoiceLedgerList
          invoices={invoices}
          pagination={pagination}
          loading={loadingStates.fetchGrid}
          onRefresh={() => loadGridData(1)}
          onEndReached={() => {
            if (pagination.currentPage < pagination.totalPages) {
              loadGridData(pagination.currentPage + 1);
            }
          }}
          onSelectInvoice={handleSelectInvoice}
        />
      </View>

      <InvoiceDetailBottomSheet
        visible={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        invoice={selectedInvoice}
        onPayNowPress={(inv) => {
          setSelectedInvoice(inv);
          setShowPaymentSheet(true);
        }}
      />

      <PaymentMethodBottomSheet
        visible={showPaymentSheet}
        onClose={() => setShowPaymentSheet(false)}
        invoice={selectedInvoice}
        onSelectMethod={handleSelectPaymentMethod}
      />

      <OfflineSettlementModal
        visible={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        invoice={selectedInvoice}
        onSubmit={handleSubmitOffline}
        loading={loadingStates.settleInvoice}
      />
    </ScreenShell>
  );
};

export default BillingLedgerScreen;
