import React, { useState, useEffect, useMemo } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Landmark, FileText, Clock, AlertCircle, ChevronRight } from 'lucide-react-native';
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

  const [paymentMethod, setPaymentMethod] = useState<'CHEQUE' | 'NEFT'>('CHEQUE');
  const [offlineReference, setOfflineReference] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
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
      setPaymentMethod('CHEQUE');
      setOfflineReference('');
      setAmountStr(remainingDue > 0 ? remainingDue.toString() : '');
      setBankName('');
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
      const autoGenRef = `${paymentMethod}-${dateStr}-${randomSuffix}`;
      const effectiveRef = offlineReference.trim() || autoGenRef;

      const fullReference = bankName.trim()
        ? `${paymentMethod}: ${effectiveRef} (${bankName.trim()})`
        : `${paymentMethod}: ${effectiveRef}`;

      const result = await settleOffline(invoice._id, {
        offlineReference: fullReference,
        offlineAmount: amountToSubmit,
        paymentMethod,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);
      await loadResidentDues();
      if (onSettlementSubmitted) onSettlementSubmitted(result);
      onClose();

      Alert.alert(
        'Offline Payment Submitted',
        `Reference #${offlineReference.trim()} for ₹${amountToSubmit.toLocaleString('en-IN')} submitted successfully. The status is now VERIFICATION_PENDING awaiting admin approval.`
      );
    } catch (err: any) {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      Alert.alert('Submission Failed', err?.message || err || 'Could not submit offline payment details.');
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={`Record Offline Payment • #${invNo}`}>
        <View className="py-2 pb-2">

          {/* Verification Pending Notice */}
          <View className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 flex-row items-start">
            <Icon as={Clock} size={20} className="text-primary me-3 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                Admin Clearance Verification Required
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Submitting offline payment details does NOT mark the invoice paid immediately. The invoice status will become VERIFICATION_PENDING until Admin/Treasury approves clearance.
              </Text>
            </View>
          </View>

          {/* Submission Blocked Guard */}
          {isSubmissionBlocked ? (
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 flex-row items-center me-1">
              <Icon as={AlertCircle} size={20} className="text-amber-600 dark:text-amber-400 me-3" />
              <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex-1">
                {isPaid ? 'This invoice has already been fully settled.' :
                 isPending ? 'An offline payment is already pending admin verification.' :
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
              1. Select Offline Payment Type
            </Text>
            <View className="flex-row gap-2.5">
              {(['CHEQUE', 'NEFT'] as const).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <Button
                    key={method}
                    variant={isSelected ? 'default' : 'outline'}
                    onPress={() => setPaymentMethod(method)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    <Text className={`font-extrabold text-sm ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {method}
                    </Text>
                  </Button>
                );
              })}
            </View>
          </View>

          {/* Section 2: Settlement Amount */}
          <View className="mb-4">
            <TextInput
              label="2. Settlement Amount (₹)"
              required
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder={`Remaining Due ₹${remainingDue.toLocaleString('en-IN')}`}
              keyboardType="numeric"
              inputClassName="font-bold text-base"
              error={isAmountTooHigh ? `Amount cannot exceed remaining dues of ₹${remainingDue.toLocaleString('en-IN')}` : undefined}
            />
          </View>

          {/* Section 3: Reference Number (Cheque # / UTR #) */}
          <View className="mb-4">
            <TextInput
              label={`3. ${paymentMethod === 'CHEQUE' ? 'Cheque Number' : 'NEFT / UTR Transaction ID'} (Optional)`}
              leftIcon={FileText}
              value={offlineReference}
              onChangeText={setOfflineReference}
              placeholder={paymentMethod === 'CHEQUE' ? 'e.g. 000124 (Optional)' : 'e.g. N123456789 (Optional)'}
            />
            <Text className="text-xs text-muted-foreground mt-1 ps-1">
              Leave blank to auto-generate a system reference number (e.g. {paymentMethod}-20260813-9182).
            </Text>
          </View>

          {/* Section 4: Bank Name (Optional) */}
          <View className="mb-5">
            <TextInput
              label="4. Issuing Bank Name (Optional)"
              leftIcon={Landmark}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. HDFC Bank / ICICI Bank"
            />
          </View>

          {/* Submit Action Button */}
          <Button
            variant="default"
            size="lg"
            className="w-full flex-row items-center justify-center"
            disabled={isSubmissionBlocked || isFormInvalid || isSubmitting || loadingStates.settleInvoice}
            loading={isSubmitting || loadingStates.settleInvoice}
            onPress={handleOpenConfirm}
            accessibilityRole="button"
            accessibilityLabel={`Submit ${paymentMethod} reference for admin verification`}
          >
            <Text className="font-bold text-base text-primary-foreground me-1">
              Submit for Admin Verification • ₹{amountToSubmit.toLocaleString('en-IN')}
            </Text>
            <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
          </Button>
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

