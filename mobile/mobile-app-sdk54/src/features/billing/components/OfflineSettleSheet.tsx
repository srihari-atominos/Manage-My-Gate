import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/common/Button';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Landmark, FileText, Calendar, Clock, AlertCircle, ShieldAlert, ChevronRight, CheckCircle2 } from 'lucide-react-native';
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
      setPaymentMethod('BANK_TRANSFER');
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
        <ScrollView className="py-2" contentContainerStyle={{ paddingBottom: 60 }}>

          {/* Verification Pending Notice */}
          <View className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 flex-row items-start">
            <Icon as={Clock} size={20} className="text-blue-600 dark:text-blue-400 me-3 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-blue-900 dark:text-blue-200">
                Admin Clearance Verification Required
              </Text>
              <Text className="text-xs text-blue-700 dark:text-blue-300 mt-1">
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
              {[
                { key: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { key: 'CASH', label: 'Cash' },
              ].map((item) => {
                const isSelected = paymentMethod === (item.key as any);
                return (
                  <Button
                    key={item.key}
                    variant={isSelected ? 'default' : 'outline'}
                    onPress={() => setPaymentMethod(item.key as any)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    <Text className={`font-extrabold text-sm ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {item.label}
                    </Text>
                  </Button>
                );
              })}
            </View>
          </View>

          {/* Section 2: Settlement Amount */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              2. Settlement Amount
            </Text>
            <View className="flex-row items-center bg-background border border-border rounded-xl px-3 py-2">
              <Text className="text-foreground font-bold text-lg me-2">₹</Text>
              <TextInput
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder={`Remaining Due ₹${remainingDue.toLocaleString('en-IN')}`}
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                className="flex-1 text-foreground font-bold text-base py-1"
              />
            </View>
            {isAmountTooHigh ? (
              <Text className="text-xs text-destructive mt-1.5 font-medium">
                Amount cannot exceed remaining dues of ₹{remainingDue.toLocaleString('en-IN')}
              </Text>
            ) : null}
          </View>

          {/* Section 3: Reference Number (Cheque # / UTR #) */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              3. Payment Reference / UTR Number (Optional)
            </Text>
            <View className="flex-row items-center bg-background border border-border rounded-xl px-3 py-2">
              <Icon as={FileText} size={18} className="text-muted-foreground me-2" />
              <TextInput
                value={offlineReference}
                onChangeText={setOfflineReference}
                placeholder="e.g. UTR12345678 or IMPS-98124"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-foreground font-bold text-base py-1"
              />
            </View>
            <Text className="text-xs text-muted-foreground mt-1">
              Leave blank to auto-generate a system reference number (e.g. {paymentMethod}-20260813-9182).
            </Text>
          </View>

          {/* Section 4: Bank Name (Optional) */}
          <View className="mb-5">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              4. Issuing Bank Name (Optional)
            </Text>
            <View className="flex-row items-center bg-background border border-border rounded-xl px-3 py-2">
              <Icon as={Landmark} size={18} className="text-muted-foreground me-2" />
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. HDFC Bank / ICICI Bank"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-foreground text-sm py-1"
              />
            </View>
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

        </ScrollView>
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
