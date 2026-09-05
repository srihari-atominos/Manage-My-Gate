import React, { useState, useEffect, useMemo } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Landmark, FileText, Clock, AlertCircle, ChevronRight, Check, Banknote, ShieldCheck } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { Invoice } from '../types';

export interface OfflineSettleSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSettlementSubmitted?: (result: any) => void;
}

export function OfflineSettleSheet({
  visible,
  onClose,
  invoice,
  onSettlementSubmitted,
}: OfflineSettleSheetProps) {
  const router = useRouter();
  const { settleOffline, loadResidentDues, loadingStates, error, resetBillingError } = useBilling();

  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH'>('CASH');
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [offlineReference, setOfflineReference] = useState<string>('');
  const [paymentDateStr, setPaymentDateStr] = useState<string>(new Date().toISOString().slice(0, 10));
  const [cashNotes, setCashNotes] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Derived figures
  const totalDue = invoice?.totalDue ?? invoice?.amount ?? 0;
  const paidAmount = invoice?.paidAmount ?? 0;
  const remainingDue = (invoice as any)?.outstandingAmount !== undefined
    ? (invoice as any).outstandingAmount
    : Math.max(0, totalDue - paidAmount);

  const amountToSubmit = useMemo(() => {
    if (paymentMode === 'FULL') return remainingDue;
    const parsed = parseFloat(customAmountStr);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [paymentMode, customAmountStr, remainingDue]);

  const remainingAfterPayment = Math.max(0, remainingDue - amountToSubmit);
  const isAmountTooHigh = amountToSubmit > remainingDue;
  const isFormInvalid = isAmountTooHigh || amountToSubmit <= 0;

  // Invoice status guard
  const status = invoice?.status || 'UNPAID';
  const isPaid = status === 'PAID';
  const isPending = status === 'VERIFICATION_PENDING';
  const isCancelled = status === 'CANCELLED';
  const isSubmissionBlocked = isPaid || isPending || isCancelled || remainingDue <= 0;

  useEffect(() => {
    if (visible && invoice) {
      setPaymentMethod('CASH');
      setPaymentMode('FULL');
      setCustomAmountStr('');
      setOfflineReference('');
      setPaymentDateStr(new Date().toISOString().slice(0, 10));
      setCashNotes('');
      setShowConfirmModal(false);
      setIsSubmitting(false);
      resetBillingError();
    }
  }, [visible, invoice, remainingDue, resetBillingError]);

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';

  const handleOpenConfirm = () => {
    if (isSubmissionBlocked || isFormInvalid) return;
    setShowConfirmModal(true);
  };

  const handleExecuteSubmission = async () => {
    if (!invoice._id || isFormInvalid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const isCash = paymentMethod === 'CASH';

      let effectiveRef = offlineReference.trim();
      if (!effectiveRef) {
        effectiveRef = isCash
          ? `CASH-REQ-${dateStr}-${randomSuffix}`
          : `BANK-${dateStr}-${randomSuffix}`;
      }

      const result = await settleOffline(invoice._id, {
        offlineReference: effectiveRef,
        offlineAmount: amountToSubmit,
        paymentMethod,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);
      await loadResidentDues();
      if (onSettlementSubmitted) onSettlementSubmitted(result);
      onClose();

      // Instant digital invoice navigation - resident immediately sees the generated invoice!
      router.push(`/(resident)/billing/invoice/${invoice._id}` as any);

      Alert.alert(
        'Payment Request Submitted!',
        `${isCash ? 'Cash payment request' : 'Bank transfer reference #' + effectiveRef} for ₹${amountToSubmit.toLocaleString('en-IN')} submitted successfully. Your invoice statement has been generated and is awaiting Admin verification.`
      );
    } catch (err: any) {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      Alert.alert('Submission Failed', err?.message || err || 'Could not submit offline payment details.');
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={`Pay Offline • #${invNo}`}>
        <View className="py-2 pb-2">

          {/* Verification Notice */}
          <View className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 flex-row items-start">
            <Icon as={Clock} size={20} className="text-primary me-3 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                Offline Payment Request
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Your invoice is generated immediately upon submission. Once verified by Admin, it will be marked as fully or partially settled.
              </Text>
            </View>
          </View>

          {/* Submission Blocked Guard */}
          {isSubmissionBlocked ? (
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 flex-row items-center me-1">
              <Icon as={AlertCircle} size={20} className="text-amber-600 dark:text-amber-400 me-3" />
              <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex-1">
                {isPaid ? 'This invoice has already been fully settled.' :
                 isPending ? 'An offline payment is already pending verification.' :
                 'Invoice is cancelled and cannot accept payments.'}
              </Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View className="mb-4">
              <ErrorBanner message={error} onDismiss={() => resetBillingError()} />
            </View>
          ) : null}

          {/* Section 1: Payment Method Selection */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              1. Choose Payment Method
            </Text>
            <View className="flex-row gap-2.5">
              {/* Cash Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPaymentMethod('CASH')}
                className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-500/10 border-emerald-500'
                    : 'bg-card border-border'
                }`}
              >
                <View className={`w-8 h-8 rounded-lg items-center justify-center ${
                  paymentMethod === 'CASH' ? 'bg-emerald-500/20' : 'bg-muted'
                }`}>
                  <Icon as={Banknote} size={18} className={paymentMethod === 'CASH' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'} />
                </View>
                <Text className={`font-extrabold text-sm ${paymentMethod === 'CASH' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  Cash
                </Text>
              </TouchableOpacity>

              {/* Bank Transfer Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPaymentMethod('BANK_TRANSFER')}
                className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border'
                }`}
              >
                <View className={`w-8 h-8 rounded-lg items-center justify-center ${
                  paymentMethod === 'BANK_TRANSFER' ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Icon as={Landmark} size={18} className={paymentMethod === 'BANK_TRANSFER' ? 'text-primary' : 'text-muted-foreground'} />
                </View>
                <Text className={`font-extrabold text-sm ${paymentMethod === 'BANK_TRANSFER' ? 'text-primary' : 'text-foreground'}`}>
                  Bank Transfer
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Select Amount (Full vs Custom) */}
          <View className="mb-4 gap-2.5">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              2. Select Amount to Pay
            </Text>

            {/* Option A: Full Amount */}
            <TouchableOpacity
              onPress={() => setPaymentMode('FULL')}
              activeOpacity={0.8}
              className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
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
                  <Text className="font-bold text-sm text-foreground">Pay Full Amount</Text>
                  <Text className="text-xs text-muted-foreground">Mark entire outstanding balance</Text>
                </View>
              </View>

              <Text className="text-base font-extrabold text-foreground">
                ₹{remainingDue.toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>

            {/* Option B: Custom Amount */}
            <TouchableOpacity
              onPress={() => setPaymentMode('CUSTOM')}
              activeOpacity={0.8}
              className={`p-3.5 rounded-xl border ${
                paymentMode === 'CUSTOM'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <View className="flex-row items-center gap-3 mb-1">
                <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                  paymentMode === 'CUSTOM' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {paymentMode === 'CUSTOM' ? <Check size={12} className="text-primary-foreground" /> : null}
                </View>
                <Text className="font-bold text-sm text-foreground">Pay Custom Amount</Text>
              </View>

              {paymentMode === 'CUSTOM' ? (
                <View className="mt-2 ps-8">
                  <TextInput
                    label="Enter Custom Amount (₹)"
                    required
                    value={customAmountStr}
                    onChangeText={setCustomAmountStr}
                    placeholder={`Max ₹${remainingDue.toLocaleString('en-IN')}`}
                    keyboardType="numeric"
                    inputClassName="font-bold text-base"
                    error={
                      isAmountTooHigh
                        ? `Cannot exceed remaining dues of ₹${remainingDue.toLocaleString('en-IN')}`
                        : undefined
                    }
                  />
                </View>
              ) : null}
            </TouchableOpacity>

            {/* Breakdown Preview */}
            <View className="bg-muted/40 border border-border/60 rounded-xl p-3 flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-foreground">Amount Being Submitted</Text>
                <Text className="text-base font-extrabold text-primary">₹{amountToSubmit.toLocaleString('en-IN')}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-muted-foreground">Remaining After Clearance</Text>
                <Text className="text-base font-bold text-foreground">₹{remainingAfterPayment.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {/* Section 3: Method Details */}
          {paymentMethod === 'CASH' ? (
            <View className="mb-4">
              <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 mb-3 flex-row items-start">
                <Icon as={ShieldCheck} size={18} className="text-emerald-600 dark:text-emerald-400 me-2.5 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Cash Payment Procedure
                  </Text>
                  <Text className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-4">
                    Hand ₹{amountToSubmit.toLocaleString('en-IN')} cash to the community office / facility manager. Admin will verify the amount and complete your receipt.
                  </Text>
                </View>
              </View>

              <TextInput
                label="3. Handover Notes / Handed To (Optional)"
                value={cashNotes}
                onChangeText={setCashNotes}
                placeholder="e.g. Paid to facility desk / Mr. Ramesh"
                leftIcon={FileText}
              />
            </View>
          ) : (
            <View className="mb-4 gap-3">
              <TextInput
                label="3. Payment Date"
                leftIcon={Clock}
                value={paymentDateStr}
                onChangeText={setPaymentDateStr}
                placeholder="YYYY-MM-DD"
              />

              <TextInput
                label="4. Payment Reference / UTR Number"
                leftIcon={FileText}
                value={offlineReference}
                onChangeText={setOfflineReference}
                placeholder="e.g. UTR12345678 or IMPS-98124"
              />
            </View>
          )}

          {/* Submit Action Button */}
          <Button
            variant="default"
            size="lg"
            className="w-full flex-row items-center justify-center mt-1"
            disabled={isSubmissionBlocked || isFormInvalid || isSubmitting || loadingStates.settleInvoice}
            loading={isSubmitting || loadingStates.settleInvoice}
            onPress={handleOpenConfirm}
            accessibilityRole="button"
            accessibilityLabel={`Submit ${paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'} payment for ₹${amountToSubmit.toLocaleString('en-IN')}`}
          >
            <Text className="font-bold text-base text-primary-foreground me-1">
              {paymentMethod === 'CASH'
                ? `Submit Cash Request • ₹${amountToSubmit.toLocaleString('en-IN')}`
                : `Submit Bank Transfer • ₹${amountToSubmit.toLocaleString('en-IN')}`}
            </Text>
            <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
          </Button>

        </View>
      </BottomSheet>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Submit Payment Request?"
        message={`Are you sure you want to submit ₹${amountToSubmit.toLocaleString('en-IN')} via ${paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'}? An invoice statement will be generated instantly and sent to Admin for verification.`}
        confirmLabel="Submit & View Invoice"
        cancelLabel="Cancel"
        variant="info"
        loading={isSubmitting || loadingStates.settleInvoice}
        onConfirm={handleExecuteSubmission}
        onCancel={() => setShowConfirmModal(false)}
      />
    </>
  );
}

export default OfflineSettleSheet;

