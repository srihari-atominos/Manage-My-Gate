import React, { useState, useEffect, useMemo } from 'react';
import { View, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateString } from '@/components/common/DatePickerModal';
import { TextInput } from '@/components/forms/TextInput';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { FileText, Clock, AlertCircle, ChevronRight } from 'lucide-react-native';
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
  const { settleOffline, loadResidentDues, loadingStates, error, resetBillingError } = useBilling();

  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [offlineReference, setOfflineReference] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentDateStr, setPaymentDateStr] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Derived figures
  const totalDue = invoice?.totalDue ?? invoice?.amount ?? 0;
  const paidAmount = invoice?.paidAmount ?? 0;
  const remainingDue = Math.max(0, totalDue - paidAmount);

  const amountToSubmit = useMemo(() => {
    const parsed = parseFloat(amountStr);
    return isNaN(parsed) || parsed <= 0 ? remainingDue : parsed;
  }, [amountStr, remainingDue]);

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
      setPaymentMethod('BANK_TRANSFER');
      setOfflineReference('');
      setAmountStr(remainingDue > 0 ? remainingDue.toString() : '');
      setPaymentDateStr(new Date().toISOString().slice(0, 10));
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
      const autoGenRef = `BANK-${dateStr}-${randomSuffix}`;
      const effectiveRef = offlineReference.trim() || autoGenRef;

      const result = await settleOffline(invoice._id, {
        paymentReference: effectiveRef,
        offlineReference: effectiveRef,
        amountPaid: amountToSubmit,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: paymentDateStr,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);
      await loadResidentDues();
      if (onSettlementSubmitted) onSettlementSubmitted(result);
      onClose();

      Alert.alert(
        'Payment Submitted',
        `Bank transfer reference #${effectiveRef} for ₹${amountToSubmit.toLocaleString('en-IN')} submitted successfully. The status is now Payment Verification Pending awaiting admin approval.`
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

          {/* Verification Pending Notice */}
          <View className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 flex-row items-start">
            <Icon as={Clock} size={20} className="text-primary me-3 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                Payment Verification Pending
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Submitting bank transfer details does NOT mark the invoice paid immediately. The community team will verify your payment details.
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

          {/* Section 1: Offline Payment Method */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              1. How did you pay?
            </Text>
            <SegmentedControl
              segments={[
                { key: 'BANK_TRANSFER', label: 'Bank Transfer / Cheque' },
                { key: 'CASH', label: 'Cash at Counter' },
              ]}
              activeSegment={paymentMethod}
              onChange={(key) => setPaymentMethod(key as any)}
            />
          </View>

          {paymentMethod === 'BANK_TRANSFER' ? (
            <>
              {/* Section 2: Amount Paid */}
              <View className="mb-4">
                <TextInput
                  label="2. Amount Paid (₹)"
                  required
                  value={amountStr}
                  onChangeText={setAmountStr}
                  placeholder={`Remaining Due ₹${remainingDue.toLocaleString('en-IN')}`}
                  keyboardType="numeric"
                  inputClassName="font-bold text-base"
                  error={isAmountTooHigh ? `Amount cannot exceed remaining dues of ₹${remainingDue.toLocaleString('en-IN')}` : undefined}
                />
              </View>

              {/* Section 3: Payment Date via Canonical DatePicker */}
              <View className="mb-4">
                <DatePicker
                  label="3. Payment Date"
                  value={paymentDateStr ? new Date(`${paymentDateStr}T00:00:00`) : new Date()}
                  onChange={(d) => setPaymentDateStr(formatDateString(d))}
                  placeholder="Select Payment Date"
                />
              </View>

              {/* Section 4: Payment Reference */}
              <View className="mb-5">
                <TextInput
                  label="4. Payment Reference / UTR Number"
                  leftIcon={FileText}
                  value={offlineReference}
                  onChangeText={setOfflineReference}
                  placeholder="e.g. UTR12345678 or IMPS-98124"
                />
              </View>

              {/* Submit Action Button */}
              <Button
                variant="default"
                size="lg"
                className="w-full mt-1"
                disabled={isSubmissionBlocked || isFormInvalid || isSubmitting || loadingStates.settleInvoice}
                loading={isSubmitting || loadingStates.settleInvoice}
                onPress={handleOpenConfirm}
                rightIcon={ChevronRight}
                accessibilityRole="button"
                accessibilityLabel="Submit Bank Transfer Details"
              >
                {`Submit Payment • ₹${amountToSubmit.toLocaleString('en-IN')}`}
              </Button>
            </>
          ) : (
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
              <Text className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
                Cash Payment Instructions
              </Text>
              <Text className="text-xs text-amber-800 dark:text-amber-300">
                Please pay the amount to the community office or authorized facility staff. You will receive a digital receipt after your payment is recorded.
              </Text>
            </View>
          )}
        </View>
      </BottomSheet>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Submit for Verification?"
        message={`Are you sure you want to submit ${paymentMethod} ref #${offlineReference.trim()} for ₹${amountToSubmit.toLocaleString('en-IN')}? This invoice will become VERIFICATION_PENDING until cleared by Admin.`}
        confirmLabel="Submit Request"
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
