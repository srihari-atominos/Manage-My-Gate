import React, { useState, useEffect, useMemo } from 'react';
import { View, Alert, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/common/Button';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateString } from '@/components/common/DatePickerModal';
import { TextInput } from '@/components/forms/TextInput';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AttachmentPicker, Attachment } from '@/components/ui/AttachmentPicker';
import {
  Landmark,
  Smartphone,
  FileCheck,
  Banknote,
  Building2,
  FileText,
  Clock,
  AlertCircle,
  ChevronRight,
  Check,
  CheckCircle2,
  Download,
  Printer,
  Copy,
} from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { billingService } from '../services/billingService';
import { Invoice } from '../types';
import { generateInvoiceHtml, exportInvoiceHtmlDocument } from '../utils/invoicePdfUtility';

export type OfflinePaymentType = 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH' | 'DEMAND_DRAFT';

interface PaymentTypeOption {
  key: OfflinePaymentType;
  label: string;
  sublabel: string;
  icon: any;
  refLabel: string;
  refPlaceholder: string;
}

const OFFLINE_METHODS: PaymentTypeOption[] = [
  {
    key: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    sublabel: 'NEFT / RTGS / IMPS',
    icon: Landmark,
    refLabel: 'UTR / Transaction Reference Number *',
    refPlaceholder: 'e.g. UTR12345678 or IMPS-98124',
  },
  {
    key: 'UPI',
    label: 'UPI / QR',
    sublabel: 'GPay, PhonePe, Paytm',
    icon: Smartphone,
    refLabel: 'UPI Ref / UTR (12 Digits) *',
    refPlaceholder: 'e.g. 12-digit UPI Reference Number',
  },
  {
    key: 'CHEQUE',
    label: 'Cheque',
    sublabel: 'Bank Cheque',
    icon: FileCheck,
    refLabel: 'Cheque Number & Bank Name *',
    refPlaceholder: 'e.g. Chq #004521, HDFC Bank',
  },
  {
    key: 'CASH',
    label: 'Cash Deposit',
    sublabel: 'Facility Office',
    icon: Banknote,
    refLabel: 'Receipt Number / Deposit Notes (Optional)',
    refPlaceholder: 'e.g. Handed to Office Manager',
  },
  {
    key: 'DEMAND_DRAFT',
    label: 'Demand Draft',
    sublabel: 'Bank DD',
    icon: Building2,
    refLabel: 'Demand Draft Number & Issuing Bank *',
    refPlaceholder: 'e.g. DD #771234, SBI',
  },
];

export interface OfflineSettleSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  initialAmount?: number;
  onSettlementSubmitted?: (result: any) => void;
  communityName?: string;
}

export function OfflineSettleSheet({
  visible,
  onClose,
  invoice,
  initialAmount,
  onSettlementSubmitted,
  communityName = 'Community Workspace',
}: OfflineSettleSheetProps) {
  const router = useRouter();
  const { settleOffline, loadResidentDues, loadingStates, error, resetBillingError } = useBilling();

  const [paymentMethod, setPaymentMethod] = useState<OfflinePaymentType>('BANK_TRANSFER');
  const [offlineReference, setOfflineReference] = useState<string>('');
  const [paymentDateStr, setPaymentDateStr] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payerNotes, setPayerNotes] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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

  // Use the pre-selected amount from the checkout flow (removing the redundant amount selection UI)
  const amountToSubmit = useMemo(() => {
    if (initialAmount !== undefined && initialAmount > 0) {
      return Math.min(initialAmount, remainingDue > 0 ? remainingDue : initialAmount);
    }
    return remainingDue;
  }, [initialAmount, remainingDue]);

  const remainingAfterPayment = Math.max(0, Math.round((remainingDue - amountToSubmit) * 100) / 100);
  const isFormInvalid = amountToSubmit <= 0;

  // Invoice status guard
  const status = invoice?.status || 'UNPAID';
  const isPaid = status === 'PAID';
  const isPending = status === 'VERIFICATION_PENDING';
  const isCancelled = status === 'CANCELLED';
  const isSubmissionBlocked = isPaid || isPending || isCancelled || remainingDue <= 0;

  const currentOption = useMemo(() => {
    return OFFLINE_METHODS.find((m) => m.key === paymentMethod) || OFFLINE_METHODS[0];
  }, [paymentMethod]);

  useEffect(() => {
    if (visible && invoice) {
      setPaymentMethod('BANK_TRANSFER');
      setOfflineReference('');
      setPayerNotes('');
      setAttachments([]);
      setPaymentDateStr(new Date().toISOString().slice(0, 10));
      setShowConfirmModal(false);
      setIsSubmitting(false);
      setSubmittedResult(null);
      resetBillingError();
    }
  }, [visible, invoice, resetBillingError]);

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';
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

      const prefixMap: Record<OfflinePaymentType, string> = {
        BANK_TRANSFER: 'BANK',
        UPI: 'UPI',
        CHEQUE: 'CHQ',
        CASH: 'CASH',
        DEMAND_DRAFT: 'DD',
      };
      const prefix = prefixMap[paymentMethod] || 'OFFLINE';

      let effectiveRef = offlineReference.trim();
      if (!effectiveRef) {
        effectiveRef = `${prefix}-${dateStr}-${randomSuffix}`;
      }

      // Upload proof attachment if attached
      let uploadedProofUrl: string | undefined;
      if (attachments.length > 0) {
        try {
          const formData = new FormData();
          const fileItem = attachments[0];
          if (Platform.OS === 'web' && fileItem.file) {
            formData.append('proof', fileItem.file);
          } else {
            formData.append('proof', {
              uri: fileItem.uri,
              name: fileItem.name || `proof_${Date.now()}.jpg`,
              type: fileItem.type || 'image/jpeg',
            } as any);
          }
          const uploadRes = await billingService.uploadProof(formData);
          uploadedProofUrl = uploadRes?.url;
        } catch (uploadErr) {
          console.warn('[OfflineSettleSheet] Proof upload fallback to local URI:', uploadErr);
          uploadedProofUrl = attachments[0].uri;
        }
      }

      const result = await settleOffline(invoice._id, {
        offlineReference: effectiveRef,
        offlineAmount: amountToSubmit,
        paymentMethod,
        paymentDate: paymentDateStr,
        paymentScreenshot: uploadedProofUrl,
        payerNotes: payerNotes.trim() || undefined,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSubmittedResult(
        result || {
          ...invoice,
          offlineReference: effectiveRef,
          offlineAmount: amountToSubmit,
          paymentMethod,
          paymentScreenshot: uploadedProofUrl,
          payerNotes: payerNotes.trim() || undefined,
        }
      );
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
        paymentMethod,
        offlineReference: offlineReference.trim() || 'OFFLINE-SUBMISSION',
      };

      const html = generateInvoiceHtml(targetInvoice, {
        communityName,
        residentName: residentStr,
      });

      const filename = `Invoice_${invNo}_${paymentMethod}.html`;
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
        title={submittedResult ? `Request Submitted • #${invNo}` : `Offline Settlement • #${invNo}`}
      >
        <ScrollView showsVerticalScrollIndicator={false} className="py-2 pb-6">
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
                  {currentOption.label} of ₹{amountToSubmit.toLocaleString('en-IN')} (Ref: #{offlineReference || 'OFFLINE-REQ'}) submitted for verification.
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
            // Offline Payment Request Submission Form
            <View className="gap-4">
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

              {/* 1. Settlement Amount Summary (Pre-selected from checkout; duplicate selection removed) */}
              <View className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs text-muted-foreground font-medium">Settlement Amount</Text>
                  <Text className="text-xl font-extrabold text-primary">
                    ₹{amountToSubmit.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-muted-foreground font-medium">Remaining Liability</Text>
                  <Text className="text-base font-bold text-foreground">
                    ₹{remainingAfterPayment.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* 2. Select Offline Payment Type */}
              <View className="gap-2">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  1. Select Payment Method
                </Text>
                <View className="gap-2">
                  {OFFLINE_METHODS.map((method) => {
                    const isSelected = paymentMethod === method.key;
                    const MethodIcon = method.icon;
                    return (
                      <TouchableOpacity
                        key={method.key}
                        onPress={() => setPaymentMethod(method.key)}
                        activeOpacity={0.8}
                        className={`p-3 rounded-xl border flex-row items-center justify-between ${
                          isSelected ? 'bg-primary/10 border-primary' : 'bg-card border-border'
                        }`}
                      >
                        <View className="flex-row items-center gap-3">
                          <View
                            className={`w-9 h-9 rounded-xl items-center justify-center ${
                              isSelected ? 'bg-primary/20' : 'bg-muted'
                            }`}
                          >
                            <Icon
                              as={MethodIcon}
                              size={18}
                              className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                            />
                          </View>
                          <View>
                            <Text className="font-bold text-sm text-foreground">{method.label}</Text>
                            <Text className="text-xs text-muted-foreground">{method.sublabel}</Text>
                          </View>
                        </View>

                        <View
                          className={`w-5 h-5 rounded-full border items-center justify-center ${
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected ? <Check size={12} className="text-primary-foreground" /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Reference and Date Details */}
              <View className="gap-2.5">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  2. Reference & Date Details
                </Text>

                <TextInput
                  label={currentOption.refLabel}
                  required={paymentMethod !== 'CASH'}
                  leftIcon={FileText}
                  value={offlineReference}
                  onChangeText={setOfflineReference}
                  placeholder={currentOption.refPlaceholder}
                />

                <DatePicker
                  label="Payment Date"
                  value={paymentDateStr ? new Date(`${paymentDateStr}T00:00:00`) : new Date()}
                  onChange={(d) => setPaymentDateStr(formatDateString(d))}
                  placeholder="Select Payment Date"
                />
              </View>

              {/* 4. Receipt / Proof Attachment */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  3. Receipt / Document Proof
                </Text>
                <Text className="text-xs text-muted-foreground mb-1">
                  Attach screenshot, bank transfer receipt, or cheque photo (Images or PDF)
                </Text>
                <AttachmentPicker
                  attachments={attachments}
                  onAdd={(newFiles) => setAttachments((prev) => [...prev, ...newFiles])}
                  onRemove={(idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  maxFiles={1}
                  accept="all"
                />
              </View>

              {/* 5. Payer Remarks / Description */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  4. Payer Description / Notes (Optional)
                </Text>
                <TextInput
                  placeholder="Add any remarks for the approver (e.g. Paid from HDFC account ending 4012)..."
                  value={payerNotes}
                  onChangeText={setPayerNotes}
                  multiline
                  numberOfLines={3}
                  inputClassName="min-h-[70px] text-start"
                />
              </View>

              {/* Submit Action Button */}
              <Button
                variant="default"
                size="lg"
                className="w-full mt-2"
                disabled={isSubmissionBlocked || isFormInvalid || isSubmitting || loadingStates.settleInvoice}
                loading={isSubmitting || loadingStates.settleInvoice}
                onPress={handleOpenConfirm}
                rightIcon={ChevronRight}
                accessibilityRole="button"
                accessibilityLabel={`Submit ${currentOption.label} payment for ₹${amountToSubmit.toLocaleString('en-IN')}`}
              >
                {`Submit ${currentOption.label} • ₹${amountToSubmit.toLocaleString('en-IN')}`}
              </Button>
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title={`Submit ${currentOption.label} Request?`}
        message={`Are you sure you want to submit ₹${amountToSubmit.toLocaleString('en-IN')} via ${currentOption.label} (Ref: ${offlineReference || 'Self-Submission'})? Your payment request will be sent to Admin for verification.`}
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
