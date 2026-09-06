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
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Landmark,
  FileText,
  Clock,
  AlertCircle,
  ChevronRight,
  Check,
  CheckCircle2,
  Download,
  Printer,
} from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { Invoice } from '../types';
import { generateInvoiceHtml, exportInvoiceHtmlDocument } from '../utils/invoicePdfUtility';

export interface OfflineSettleSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSettlementSubmitted?: (result: any) => void;
  communityName?: string;
}

export function OfflineSettleSheet({
  visible,
  onClose,
  invoice,
  onSettlementSubmitted,
  communityName = 'Community Workspace',
}: OfflineSettleSheetProps) {
  const router = useRouter();
  const { settleOffline, loadResidentDues, loadingStates, error, resetBillingError } = useBilling();

  // Resident flow is strictly Bank Transfer
  const paymentMethod = 'BANK_TRANSFER';
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [offlineReference, setOfflineReference] = useState<string>('');
  const [paymentDateStr, setPaymentDateStr] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Post-submission PDF state
  const [submittedResult, setSubmittedResult] = useState<any | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Derived figures
  const totalDue = invoice?.totalDue ?? invoice?.amount ?? 0;
  const paidAmount = invoice?.paidAmount ?? 0;
  const remainingDue =
    (invoice as any)?.outstandingAmount !== undefined
      ? (invoice as any).outstandingAmount
      : Math.max(0, totalDue - paidAmount);

  const amountToSubmit = useMemo(() => {
    if (paymentMode === 'FULL') return remainingDue;
    const parsed = parseFloat(customAmountStr);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [paymentMode, customAmountStr, remainingDue]);

  const remainingAfterPayment = Math.max(0, Math.round((remainingDue - amountToSubmit) * 100) / 100);
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
      setPaymentMode('FULL');
      setCustomAmountStr('');
      setOfflineReference('');
      setPaymentDateStr(new Date().toISOString().slice(0, 10));
      setShowConfirmModal(false);
      setIsSubmitting(false);
      setSubmittedResult(null);
      resetBillingError();
    }
  }, [visible, invoice, remainingDue, resetBillingError]);

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : 'Villa Unit';
  const residentStr = invoice.targetUser || (invoice as any)?.residentName || 'Resident';

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

      let effectiveRef = offlineReference.trim();
      if (!effectiveRef) {
        effectiveRef = `BANK-${dateStr}-${randomSuffix}`;
      }

      const result = await settleOffline(invoice._id, {
        offlineReference: effectiveRef,
        offlineAmount: amountToSubmit,
        paymentMethod,
        paymentDate: paymentDateStr,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSubmittedResult(result || { ...invoice, offlineReference: effectiveRef, offlineAmount: amountToSubmit });
      await loadResidentDues();
      if (onSettlementSubmitted) onSettlementSubmitted(result);
    } catch (err: any) {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      Alert.alert('Submission Failed', err?.message || err || 'Could not submit offline payment details.');
    }
  };

  // PDF Actions
  const handlePdfAction = async (action: 'download' | 'print') => {
    try {
      setIsExportingPdf(true);
      const targetInvoice = {
        ...invoice,
        paidAmount: (invoice.paidAmount || 0) + amountToSubmit,
        outstandingAmount: remainingAfterPayment,
        status: remainingAfterPayment === 0 ? 'PAID' : 'PARTIALLY_PAID',
        paymentMethod: 'BANK_TRANSFER',
        offlineReference: offlineReference.trim() || 'BANK-SUBMISSION',
      };

      const html = generateInvoiceHtml(targetInvoice, {
        communityName,
        residentName: residentStr,
      });

      const filename = `Invoice_${invNo}_BankTransfer.html`;
      await exportInvoiceHtmlDocument(html, filename, `Invoice Statement #${invNo}`, { action });
      setIsExportingPdf(false);
    } catch (pdfErr: any) {
      setIsExportingPdf(false);
      Alert.alert('PDF Generation Failed', pdfErr?.message || 'Unable to generate invoice PDF.');
    }
  };

  const handleDone = () => {
    onClose();
    if (invoice._id) {
      router.push(`/(resident)/billing/invoice/${invoice._id}` as any);
    }
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={submittedResult ? `Request Submitted • #${invNo}` : `Bank Transfer • #${invNo}`}
      >
        <View className="py-2 pb-2">
          {/* Post Submission Success View */}
          {submittedResult ? (
            <View className="gap-4">
              <View className="bg-status-success/10 border border-status-success/30 rounded-2xl p-5 items-center justify-center">
                <View className="w-12 h-12 rounded-full bg-status-success/20 items-center justify-center mb-2">
                  <Icon as={CheckCircle2} size={28} className="text-status-success" />
                </View>
                <Text className="font-extrabold text-lg text-foreground text-center">
                  Payment Request Submitted!
                </Text>
                <Text className="text-xs text-muted-foreground text-center mt-1">
                  Bank transfer of ₹{amountToSubmit.toLocaleString('en-IN')} (Ref: #{offlineReference || 'BANK-TRANSFER'}) submitted for verification.
                </Text>

                <View className="mt-3 flex-row items-center gap-2">
                  <StatusBadge label="VERIFICATION PENDING" variant="warning" />
                  {remainingAfterPayment > 0 ? (
                    <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Remaining: ₹{remainingAfterPayment.toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* PDF Actions CTA */}
              <View className="bg-card border border-border rounded-xl p-4 gap-3">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Invoice & Statement Documents
                </Text>

                <View className="flex-row gap-2.5">
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 flex-row items-center justify-center gap-2 border-primary/40 bg-primary/10"
                    onPress={() => handlePdfAction('print')}
                    disabled={isExportingPdf}
                    accessibilityRole="button"
                    accessibilityLabel="View PDF Invoice"
                  >
                    <Icon as={Printer} size={16} className="text-primary" />
                    <Text className="text-primary font-bold text-sm">View PDF</Text>
                  </Button>

                  <Button
                    variant="default"
                    size="default"
                    className="flex-1 flex-row items-center justify-center gap-2 bg-primary"
                    onPress={() => handlePdfAction('download')}
                    disabled={isExportingPdf}
                    accessibilityRole="button"
                    accessibilityLabel="Download PDF Invoice"
                  >
                    <Icon as={Download} size={16} className="text-primary-foreground" />
                    <Text className="text-primary-foreground font-bold text-sm">Download PDF</Text>
                  </Button>
                </View>
              </View>

              <Button
                variant="secondary"
                size="lg"
                className="w-full mt-2"
                onPress={handleDone}
                accessibilityRole="button"
                accessibilityLabel="View Invoice Details"
              >
                <Text className="font-bold text-sm text-foreground">View Invoice Details</Text>
              </Button>
            </View>
          ) : (
            // Bank Transfer Submission Form
            <View className="gap-3">
              {/* Verification Notice */}
              <View className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex-row items-start">
                <Icon as={Clock} size={18} className="text-primary me-2.5 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-foreground">
                    Bank Transfer (NEFT / IMPS / UPI)
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Submit your bank transfer reference after transferring funds to the society account. Admin will verify and reconcile.
                  </Text>
                </View>
              </View>

              {/* Submission Blocked Guard */}
              {isSubmissionBlocked ? (
                <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex-row items-center">
                  <Icon as={AlertCircle} size={18} className="text-amber-600 dark:text-amber-400 me-2.5" />
                  <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex-1">
                    {isPaid
                      ? 'This invoice has already been fully settled.'
                      : isPending
                      ? 'A payment submission is already pending admin verification.'
                      : 'Invoice cannot accept payments at this time.'}
                  </Text>
                </View>
              ) : null}

              {/* Error Banner */}
              {error ? (
                <View>
                  <ErrorBanner message={error} onDismiss={() => resetBillingError()} />
                </View>
              ) : null}

              {/* Section 1: Amount Selection (Full vs Custom) */}
              <View className="gap-2">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  1. Amount to Pay
                </Text>

                {/* Option A: Full Amount */}
                <TouchableOpacity
                  onPress={() => setPaymentMode('FULL')}
                  activeOpacity={0.8}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    paymentMode === 'FULL'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        paymentMode === 'FULL' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}
                    >
                      {paymentMode === 'FULL' ? <Check size={12} className="text-primary-foreground" /> : null}
                    </View>
                    <View>
                      <Text className="font-bold text-sm text-foreground">Full Outstanding Due</Text>
                      <Text className="text-xs text-muted-foreground">Clear entire remaining balance</Text>
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
                  className={`p-3 rounded-xl border ${
                    paymentMode === 'CUSTOM'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  <View className="flex-row items-center gap-3 mb-1">
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        paymentMode === 'CUSTOM' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}
                    >
                      {paymentMode === 'CUSTOM' ? <Check size={12} className="text-primary-foreground" /> : null}
                    </View>
                    <Text className="font-bold text-sm text-foreground">Custom Partial Amount</Text>
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
                    <Text className="text-xs text-muted-foreground">Paying Now</Text>
                    <Text className="text-base font-extrabold text-primary">
                      ₹{amountToSubmit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-muted-foreground">Remaining After Clearance</Text>
                    <Text className="text-base font-bold text-foreground">
                      ₹{remainingAfterPayment.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section 2: Transfer Details */}
              <View className="gap-2.5">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  2. Transfer Reference Details
                </Text>

                <TextInput
                  label="Payment Reference / UTR Number"
                  required
                  leftIcon={FileText}
                  value={offlineReference}
                  onChangeText={setOfflineReference}
                  placeholder="e.g. UTR12345678 or IMPS-98124"
                />

                <TextInput
                  label="Payment Date"
                  leftIcon={Clock}
                  value={paymentDateStr}
                  onChangeText={setPaymentDateStr}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              {/* Submit Action Button */}
              <Button
                variant="default"
                size="lg"
                className="w-full flex-row items-center justify-center mt-1"
                disabled={isSubmissionBlocked || isFormInvalid || isSubmitting || loadingStates.settleInvoice}
                loading={isSubmitting || loadingStates.settleInvoice}
                onPress={handleOpenConfirm}
                accessibilityRole="button"
                accessibilityLabel={`Submit Bank Transfer payment for ₹${amountToSubmit.toLocaleString('en-IN')}`}
              >
                <Text className="font-bold text-base text-primary-foreground me-1">
                  {`Submit Bank Transfer • ₹${amountToSubmit.toLocaleString('en-IN')}`}
                </Text>
                <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
              </Button>
            </View>
          )}
        </View>
      </BottomSheet>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Submit Bank Transfer Request?"
        message={`Are you sure you want to submit ₹${amountToSubmit.toLocaleString('en-IN')} via Bank Transfer (Ref: ${offlineReference || 'Self-Transfer'})? Your payment will be sent to Admin for verification.`}
        confirmLabel="Confirm & Submit"
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
