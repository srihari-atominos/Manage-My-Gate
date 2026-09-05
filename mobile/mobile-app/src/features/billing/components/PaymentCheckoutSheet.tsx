import React, { useState, useEffect, useMemo } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Wallet, CreditCard, AlertCircle, ChevronRight, Check, Landmark } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useMobilePayment, PaymentMethod } from '../hooks/useMobilePayment';
import { Invoice } from '../types';
import { RazorpayCheckoutModal, RazorpayCheckoutOptions } from './RazorpayCheckoutModal';

export interface PaymentCheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onOpenOfflineSheet?: (invoice: Invoice, amountToPay: number) => void;
  onPaymentSuccess?: (result: any) => void;
}

export function PaymentCheckoutSheet({
  visible,
  onClose,
  invoice,
  onOpenOfflineSheet,
  onPaymentSuccess,
}: PaymentCheckoutSheetProps) {
  const router = useRouter();
  const { walletBalance, loadResidentDues } = useBilling();
  const {
    paymentState,
    isGlobalSettling,
    processWalletPayment,
    initiateRazorpayPayment,
    confirmRazorpayPayment,
    resetPaymentState,
  } = useMobilePayment();

  // Selection states
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('WALLET');
  const [showWalletConfirmModal, setShowWalletConfirmModal] = useState<boolean>(false);
  const [showUnknownStateAlert, setShowUnknownStateAlert] = useState<boolean>(false);
  const [razorpayOptions, setRazorpayOptions] = useState<RazorpayCheckoutOptions | null>(null);

  // Derived figures
  const totalDue = invoice?.totalDue ?? invoice?.amount ?? 0;
  const paidAmount = invoice?.paidAmount ?? 0;
  const remainingDue = (invoice as any)?.outstandingAmount !== undefined
    ? (invoice as any).outstandingAmount
    : Math.max(0, totalDue - paidAmount);

  // Parse amount to pay
  const amountToPay = useMemo(() => {
    if (paymentMode === 'FULL') return remainingDue;
    const parsed = parseFloat(customAmountStr);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [paymentMode, customAmountStr, remainingDue]);

  const remainingAfterPayment = Math.max(0, remainingDue - amountToPay);
  const isWalletInsufficient = selectedMethod === 'WALLET' && walletBalance < amountToPay;
  const isAmountTooHigh = amountToPay > remainingDue;
  const isAmountInvalid = amountToPay <= 0 || isAmountTooHigh;

  // Invoice eligibility
  const status = invoice?.status || 'UNPAID';
  const isPaid = status === 'PAID';
  const isPendingVerification = status === 'VERIFICATION_PENDING';
  const isCancelled = status === 'CANCELLED';
  const isPaymentDisabled = isPaid || isPendingVerification || isCancelled || remainingDue <= 0;

  useEffect(() => {
    if (visible) {
      resetPaymentState();
      setPaymentMode('FULL');
      setCustomAmountStr('');
      setSelectedMethod(walletBalance >= remainingDue ? 'WALLET' : 'RAZORPAY');
      setShowWalletConfirmModal(false);
      setShowUnknownStateAlert(false);
    }
  }, [visible, invoice, walletBalance, remainingDue, resetPaymentState]);

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';

  // --- Handlers ---

  const handleOpenWalletRecharge = () => {
    onClose();
    router.push('/(resident)/billing/wallet' as any);
  };

  const handleInitiatePayment = () => {
    if (isPaymentDisabled || isAmountInvalid) return;

    if (selectedMethod === 'OFFLINE') {
      onClose();
      if (onOpenOfflineSheet && invoice) {
        onOpenOfflineSheet(invoice, amountToPay);
      }
      return;
    }

    if (selectedMethod === 'WALLET') {
      if (isWalletInsufficient) {
        Alert.alert('Insufficient Wallet Balance', `Insufficient wallet balance. Please recharge your wallet or choose Razorpay.`);
        return;
      }
      setShowWalletConfirmModal(true);
    } else if (selectedMethod === 'RAZORPAY') {
      handleProcessRazorpay();
    }
  };

  const handleConfirmWalletPayment = async () => {
    if (!invoice._id || amountToPay <= 0) return;
    try {
      const result = await processWalletPayment(invoice._id, amountToPay);
      setShowWalletConfirmModal(false);
      await loadResidentDues();
      if (onPaymentSuccess) onPaymentSuccess(result);
      onClose();
      router.push(`/(resident)/billing/invoice/${invoice._id}` as any);
      Alert.alert('Payment Successful!', `Settled ₹${amountToPay.toLocaleString('en-IN')} via Digital Wallet for Invoice #${invNo}.`);
    } catch (err: any) {
      setShowWalletConfirmModal(false);
      Alert.alert('Wallet Payment Failed', err.message || 'Transaction could not be completed.');
    }
  };

  const handleProcessRazorpay = async () => {
    if (!invoice._id || amountToPay <= 0) return;

    try {
      const orderData = await initiateRazorpayPayment(invoice._id, amountToPay);
      
      const keyId = orderData?.razorpayKeyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';
      const orderId = orderData?.orderId || orderData?.id || '';
      const paymentId = orderData?.paymentId || '';

      setRazorpayOptions({
        razorpayKeyId: keyId,
        orderId,
        paymentId,
        amount: amountToPay,
        currency: orderData?.currency || 'INR',
        description: `Settlement for Invoice #${invNo}`,
        customerName: (invoice as any)?.targetUser || 'Resident',
      });
    } catch (err: any) {
      if (err?.code === 'NETWORK_ERROR' || err?.message?.includes('network')) {
        setShowUnknownStateAlert(true);
      } else {
        Alert.alert('Payment Failed', err.message || 'Razorpay order creation failed.');
      }
    }
  };

  const handleRazorpaySuccess = async (payload: any) => {
    setRazorpayOptions(null);
    try {
      const verifyResult = await confirmRazorpayPayment(payload);
      await loadResidentDues();
      if (onPaymentSuccess) onPaymentSuccess(verifyResult);
      onClose();
      router.push(`/(resident)/billing/invoice/${invoice._id}` as any);
      Alert.alert('Razorpay Payment Confirmed!', `Verified & settled ₹${amountToPay.toLocaleString('en-IN')} for Invoice #${invNo}.`);
    } catch (err: any) {
      if (err?.code === 'NETWORK_ERROR' || err?.message?.includes('network')) {
        setShowUnknownStateAlert(true);
      } else {
        Alert.alert('Signature Verification Failed', err.message || 'Payment signature could not be verified by backend.');
      }
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={`Payment Checkout • #${invNo}`}>
        <View className="py-2 pb-2">

          {/* Payment Disabled Alert */}
          {isPaymentDisabled ? (
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 flex-row items-center me-1">
              <Icon as={AlertCircle} size={20} className="text-amber-600 dark:text-amber-400 me-3" />
              <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex-1">
                {isPaid ? 'This invoice has already been fully settled.' :
                 isPendingVerification ? 'Offline payment submitted and pending admin verification.' :
                 'Invoice is cancelled and cannot accept payments.'}
              </Text>
            </View>
          ) : null}

          {/* Payment Error Banner */}
          {paymentState.error ? (
            <View className="mb-4">
              <ErrorBanner message={paymentState.error} onDismiss={() => resetPaymentState()} />
            </View>
          ) : null}

          {/* Section 1: Payment Amount Selection */}
          <View className="mb-5 gap-2.5">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              1. Select Payment Amount
            </Text>

            {/* Full Amount Option */}
            <TouchableOpacity
              onPress={() => setPaymentMode('FULL')}
              activeOpacity={0.8}
              className={`p-4 rounded-xl border flex-row items-center justify-between ${
                paymentMode === 'FULL'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                  paymentMode === 'FULL' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {paymentMode === 'FULL' ? <Check size={12} className="text-primary-foreground" /> : null}
                </View>
                <View>
                  <Text className="font-bold text-sm text-foreground">Pay Full Remaining Amount</Text>
                  <Text className="text-xs text-muted-foreground">Settle total outstanding invoice balance</Text>
                </View>
              </View>

              <Text className="text-base font-extrabold text-foreground">
                ₹{remainingDue.toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>

            {/* Custom Partial Amount Option */}
            <TouchableOpacity
              onPress={() => setPaymentMode('CUSTOM')}
              activeOpacity={0.8}
              className={`p-4 rounded-xl border ${
                paymentMode === 'CUSTOM'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-3 mb-2">
                <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                  paymentMode === 'CUSTOM' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {paymentMode === 'CUSTOM' ? <Check size={12} className="text-primary-foreground" /> : null}
                </View>
                <Text className="font-bold text-sm text-foreground">Pay Custom Partial Amount</Text>
              </View>

              {paymentMode === 'CUSTOM' ? (
                <View className="mt-2 ps-8">
                  <TextInput
                    label="Custom Settlement Amount (₹)"
                    value={customAmountStr}
                    onChangeText={setCustomAmountStr}
                    placeholder={`Enter amount (Max ₹${remainingDue})`}
                    keyboardType="numeric"
                    inputClassName="font-bold text-base"
                    error={isAmountTooHigh ? `Amount cannot exceed remaining due of ₹${remainingDue.toLocaleString('en-IN')}` : undefined}
                  />
                </View>
              ) : null}
            </TouchableOpacity>

            {/* Amount Breakdown Preview */}
            <View className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-foreground">Amount Being Paid Now</Text>
                <Text className="text-base font-extrabold text-primary">₹{amountToPay.toLocaleString('en-IN')}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-muted-foreground">Remaining After Payment</Text>
                <Text className="text-base font-bold text-foreground">₹{remainingAfterPayment.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {/* Section 2: Payment Method Selection */}
          <View className="mb-5 gap-2.5">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              2. Select Payment Method
            </Text>

            {/* Digital Wallet Option */}
            <TouchableOpacity
              onPress={() => setSelectedMethod('WALLET')}
              activeOpacity={0.8}
              className={`p-4 rounded-xl border flex-row items-center justify-between ${
                selectedMethod === 'WALLET' ? 'bg-status-success/10 border-status-success' : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center flex-1 me-2 gap-3">
                <View className="w-10 h-10 rounded-xl bg-status-success/15 items-center justify-center">
                  <Icon as={Wallet} size={20} className="text-status-success" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-sm text-foreground">Digital Wallet</Text>
                  <Text className="text-xs text-muted-foreground">
                    Available Balance: ₹{walletBalance.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {isWalletInsufficient ? (
                <View className="bg-destructive/10 px-2.5 py-1 rounded-md">
                  <Text className="text-xs font-bold text-destructive">Insufficient</Text>
                </View>
              ) : (
                <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                  selectedMethod === 'WALLET' ? 'border-status-success bg-status-success' : 'border-muted-foreground'
                }`}>
                  {selectedMethod === 'WALLET' ? <Check size={12} className="text-primary-foreground" /> : null}
                </View>
              )}
            </TouchableOpacity>

            {/* Razorpay Online Option */}
            <TouchableOpacity
              onPress={() => setSelectedMethod('RAZORPAY')}
              activeOpacity={0.8}
              className={`p-4 rounded-xl border flex-row items-center justify-between ${
                selectedMethod === 'RAZORPAY' ? 'bg-primary/10 border-primary' : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                  <Icon as={CreditCard} size={20} className="text-primary" />
                </View>
                <View>
                  <Text className="font-bold text-sm text-foreground">Razorpay Online</Text>
                  <Text className="text-xs text-muted-foreground">UPI, Credit/Debit Card, NetBanking</Text>
                </View>
              </View>

              <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                selectedMethod === 'RAZORPAY' ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}>
                {selectedMethod === 'RAZORPAY' ? <Check size={12} className="text-primary-foreground" /> : null}
              </View>
            </TouchableOpacity>

            {/* Pay Offline (Bank Transfer) Option */}
            <TouchableOpacity
              onPress={() => setSelectedMethod('OFFLINE')}
              activeOpacity={0.8}
              className={`p-4 rounded-xl border flex-row items-center justify-between ${
                selectedMethod === 'OFFLINE' ? 'bg-amber-500/10 border-amber-500' : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-amber-500/10 items-center justify-center">
                  <Icon as={Landmark} size={20} className="text-amber-600 dark:text-amber-400" />
                </View>
                <View>
                  <Text className="font-bold text-sm text-foreground">Pay via Bank Transfer</Text>
                  <Text className="text-xs text-muted-foreground">Bank Transfer (NEFT / IMPS / UPI)</Text>
                </View>
              </View>

              <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                selectedMethod === 'OFFLINE' ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground'
              }`}>
                {selectedMethod === 'OFFLINE' ? <Check size={12} className="text-primary-foreground" /> : null}
              </View>
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <Button
            variant="default"
            size="lg"
            className="w-full flex-row items-center justify-center mt-2"
            disabled={isPaymentDisabled || isAmountInvalid || (selectedMethod === 'WALLET' && isWalletInsufficient) || isGlobalSettling}
            loading={isGlobalSettling}
            onPress={handleInitiatePayment}
            accessibilityRole="button"
            accessibilityLabel={`Confirm and Pay ₹${amountToPay.toLocaleString('en-IN')}`}
          >
            <Text className="font-bold text-base text-primary-foreground me-1">
              {selectedMethod === 'WALLET'
                ? `Pay ₹${amountToPay.toLocaleString('en-IN')} via Wallet`
                : selectedMethod === 'OFFLINE'
                ? `Proceed with Bank Transfer (₹${amountToPay.toLocaleString('en-IN')})`
                : `Proceed to Razorpay (₹${amountToPay.toLocaleString('en-IN')})`}
            </Text>
            <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
          </Button>

        </View>
      </BottomSheet>

      {/* Wallet Deduction Confirmation Modal */}
      <ConfirmationModal
        visible={showWalletConfirmModal}
        title="Confirm Wallet Payment"
        message={`Are you sure you want to deduct ₹${amountToPay.toLocaleString('en-IN')} from your Digital Wallet to settle Invoice #${invNo}? Your remaining wallet balance will become ₹${(walletBalance - amountToPay).toLocaleString('en-IN')}.`}
        confirmLabel="Confirm & Pay"
        cancelLabel="Cancel"
        variant="info"
        loading={isGlobalSettling}
        onConfirm={handleConfirmWalletPayment}
        onCancel={() => setShowWalletConfirmModal(false)}
      />

      {/* Unknown Payment Reconciliation Alert Modal */}
      <ConfirmationModal
        visible={showUnknownStateAlert}
        title="Payment Verification In Progress"
        message="Your payment was submitted to Razorpay, but network status is unknown. Please wait while we reconcile the payment with the server."
        confirmLabel="Check Payment Status"
        cancelLabel="Close"
        variant="info"
        loading={isGlobalSettling}
        onConfirm={async () => {
          await loadResidentDues();
          setShowUnknownStateAlert(false);
          onClose();
        }}
        onCancel={() => setShowUnknownStateAlert(false)}
      />

      {/* Razorpay WebView Checkout Modal */}
      <RazorpayCheckoutModal
        visible={!!razorpayOptions}
        options={razorpayOptions}
        onSuccess={handleRazorpaySuccess}
        onDismiss={(reason) => {
          setRazorpayOptions(null);
          Alert.alert('Payment Cancelled', reason || 'Payment was cancelled by user.');
        }}
        onError={(err) => {
          setRazorpayOptions(null);
          Alert.alert('Payment Error', err.description || 'Razorpay checkout encountered an error.');
        }}
      />
    </>
  );
}

export default PaymentCheckoutSheet;

