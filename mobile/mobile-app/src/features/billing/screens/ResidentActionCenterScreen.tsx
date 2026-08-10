import React, { useEffect, useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { ScreenShell, ConfirmationModal } from '@/components/ui';
import { SuccessToast, ErrorBanner } from '@/components/feedback';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import {
  HeroLiabilityBanner,
  DuesBreakdownList,
  PaymentMethodBottomSheet,
  OfflineSettlementModal,
  InvoiceDetailBottomSheet,
} from '../components';

export const ResidentActionCenterScreen: React.FC = () => {
  const {
    activeDues,
    loadingStates,
    error,
    fetchMyDues,
    payWithWallet,
    initRazorpayCheckout,
    verifyPayment,
    settleOffline,
    clearError,
  } = useBilling();

  // Attach WebSocket listener for live real-time updates
  useBillingSocket();

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showWalletConfirm, setShowWalletConfirm] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMyDues();
  }, [fetchMyDues]);

  const handlePayPress = (item: any) => {
    setSelectedItem(item);
    setShowPaymentSheet(true);
  };

  const handleViewDetails = (item: any) => {
    setSelectedItem(item);
    setShowDetailSheet(true);
  };

  const handleSelectPaymentMethod = async (method: 'WALLET' | 'RAZORPAY' | 'OFFLINE') => {
    setShowPaymentSheet(false);
    if (!selectedItem) return;

    const invoiceId = selectedItem.invoiceId || selectedItem._id;

    if (method === 'WALLET') {
      setShowWalletConfirm(true);
    } else if (method === 'OFFLINE') {
      setShowOfflineModal(true);
    } else if (method === 'RAZORPAY') {
      try {
        const orderData = await initRazorpayCheckout(invoiceId, selectedItem.amount || selectedItem.totalDue || 0);
        Alert.alert(
          'Online Gateway Triggered',
          `Razorpay Order #${orderData?.orderId || orderData?.id || 'Created'}. Signature verification active.`,
          [{ text: 'Simulate Success Verification', onPress: () => handleVerifyRazorpay(orderData) }]
        );
      } catch (err: any) {
        Alert.alert('Payment Error', err.message || 'Failed to initialize gateway');
      }
    }
  };

  const handleConfirmWalletPayment = async () => {
    setShowWalletConfirm(false);
    if (!selectedItem) return;
    const invoiceId = selectedItem.invoiceId || selectedItem._id;
    try {
      await payWithWallet(invoiceId);
      setSuccessMessage('Invoice successfully paid using wallet balance!');
      fetchMyDues();
    } catch (err: any) {
      // Error handled in Redux state
    }
  };

  const handleVerifyRazorpay = async (orderData: any) => {
    try {
      await verifyPayment({
        paymentId: `pay_${Date.now()}`,
        orderId: orderData?.orderId || orderData?.id || 'order_simulated',
        razorpaySignature: 'simulated_sig',
      });
      setSuccessMessage('Razorpay online payment verified successfully!');
      fetchMyDues();
    } catch (err: any) {
      // Error handled in Redux state
    }
  };

  const handleSubmitOffline = async (payload: { offlineReference: string; paymentMethod: string; proofUrl?: string }) => {
    setShowOfflineModal(false);
    if (!selectedItem) return;
    const invoiceId = selectedItem.invoiceId || selectedItem._id;
    try {
      await settleOffline(invoiceId, payload.offlineReference, payload.paymentMethod);
      setSuccessMessage('Offline payment reference submitted! Status updated to Verification Pending.');
      fetchMyDues();
    } catch (err: any) {
      // Error handled in Redux state
    }
  };

  return (
    <ScreenShell
      title="Action & Dispute Center"
      subtitle="View unit portfolio dues, pay invoices & manage tax receipts"
      iconName="CreditCard"
      loading={loadingStates.fetchDues && !activeDues.unitBreakdown.length}
    >
      <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
        {error && <ErrorBanner message={error} onDismiss={clearError} />}
        {successMessage && (
          <SuccessToast
            message={successMessage}
            visible={Boolean(successMessage)}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}

        <HeroLiabilityBanner
          totalPortfolioDue={activeDues.totalPortfolioDue}
          unitBreakdown={activeDues.unitBreakdown}
          secondaryCompliance={activeDues.secondaryCompliance}
        />

        <DuesBreakdownList
          unitBreakdown={activeDues.unitBreakdown}
          onPayItemPress={handlePayPress}
          onViewDetailsPress={handleViewDetails}
          loading={loadingStates.fetchDues}
        />
      </ScrollView>

      {/* Payment Selection Bottom Sheet */}
      <PaymentMethodBottomSheet
        visible={showPaymentSheet}
        onClose={() => setShowPaymentSheet(false)}
        invoice={selectedItem}
        onSelectMethod={handleSelectPaymentMethod}
      />

      {/* Wallet Payment Confirmation */}
      <ConfirmationModal
        visible={showWalletConfirm}
        onCancel={() => setShowWalletConfirm(false)}
        onConfirm={handleConfirmWalletPayment}
        title="Confirm Wallet Payment"
        message={`Deduct ₹${(selectedItem?.amount || selectedItem?.totalDue || 0).toLocaleString()} from your community wallet balance?`}
        confirmLabel="Pay Now"
        loading={loadingStates.settleInvoice}
      />

      {/* Offline Settlement Modal */}
      <OfflineSettlementModal
        visible={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        invoice={selectedItem}
        onSubmit={handleSubmitOffline}
        loading={loadingStates.settleInvoice}
      />

      {/* Invoice Detail Sheet */}
      <InvoiceDetailBottomSheet
        visible={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        invoice={selectedItem}
        onPayNowPress={(inv) => {
          setSelectedItem(inv);
          setShowPaymentSheet(true);
        }}
      />
    </ScreenShell>
  );
};

export default ResidentActionCenterScreen;
