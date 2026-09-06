import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import {
  Banknote,
  Landmark,
  Check,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { Invoice } from '../types';
import { generateInvoiceHtml, exportInvoiceHtmlDocument } from '../utils/invoicePdfUtility';
import billingService from '../services/billingService';

export interface AdminOfflineSettleSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: (updatedInvoice: any) => void;
  communityName?: string;
}

export function AdminOfflineSettleSheet({
  visible,
  onClose,
  invoice,
  onSuccess,
  communityName = 'Community Workspace',
}: AdminOfflineSettleSheetProps) {
  // Method: Bank Transfer or Cash
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH'>('CASH');
  // Amount Mode: Full or Custom
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Flow State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Post-payment success state
  const [settledResult, setSettledResult] = useState<any | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Financial figures
  const totalDue = invoice?.totalDue ?? invoice?.amount ?? 0;
  const paidAmount = invoice?.paidAmount ?? 0;
  const remainingDue =
    (invoice as any)?.outstandingAmount !== undefined
      ? (invoice as any).outstandingAmount
      : Math.max(0, totalDue - paidAmount);

  const amountToSettle = useMemo(() => {
    if (paymentMode === 'FULL') return remainingDue;
    const parsed = parseFloat(customAmountStr);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [paymentMode, customAmountStr, remainingDue]);

  const remainingAfterPayment = Math.max(0, Math.round((remainingDue - amountToSettle) * 100) / 100);
  const willBeFullyPaid = remainingAfterPayment === 0;

  const isAmountTooHigh = amountToSettle > remainingDue;
  const isFormInvalid = isAmountTooHigh || amountToSettle <= 0;

  // Reset form upon opening
  useEffect(() => {
    if (visible && invoice) {
      setPaymentMethod('CASH');
      setPaymentMode('FULL');
      setCustomAmountStr('');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      setReferenceNumber(`CASH-${dateStr}-${rand}`);
      setNotes('');
      setError(null);
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSettledResult(null);
    }
  }, [visible, invoice, remainingDue]);

  // Update auto reference when payment method toggles
  const handleMethodChange = (method: 'BANK_TRANSFER' | 'CASH') => {
    setPaymentMethod(method);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setReferenceNumber(method === 'CASH' ? `CASH-${dateStr}-${rand}` : `BANK-${dateStr}-${rand}`);
  };

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : 'Villa Unit';
  const residentStr = invoice.targetUser || (invoice as any)?.residentName || 'Resident';

  const handleRecordPayment = async () => {
    if (!invoice._id || isFormInvalid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        amount: amountToSettle,
        settlementType: willBeFullyPaid ? ('FULL' as const) : ('CUSTOM' as const),
        paymentMethod,
        paymentReference: referenceNumber.trim() || undefined,
        reference: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const result = await billingService.approveInvoiceOffline(invoice._id, payload);

      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSettledResult(result);
      if (onSuccess) onSuccess(result);
    } catch (err: any) {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to record offline payment';
      setError(errMsg);
      Alert.alert('Payment Recording Failed', errMsg);
    }
  };

  // PDF Actions
  const handlePdfAction = async (action: 'download' | 'print') => {
    try {
      setIsExportingPdf(true);
      const targetInvoice = settledResult || {
        ...invoice,
        paidAmount: (invoice.paidAmount || 0) + amountToSettle,
        outstandingAmount: remainingAfterPayment,
        status: willBeFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        paymentMethod,
        offlineReference: referenceNumber,
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
      Alert.alert('PDF Generation Failed', pdfErr?.message || 'Unable to render invoice PDF.');
    }
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={settledResult ? `Receipt Generated • #${invNo}` : `Record Offline Payment • #${invNo}`}
      >
        <View className="py-2 pb-3">
          {error ? (
            <View className="mb-3">
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </View>
          ) : null}

          {/* If already settled successfully, show PDF actions and summary */}
          {settledResult ? (
            <View className="gap-4">
              <View className="bg-status-success/10 border border-status-success/30 rounded-2xl p-5 items-center justify-center">
                <View className="w-12 h-12 rounded-full bg-status-success/20 items-center justify-center mb-2">
                  <Icon as={CheckCircle2} size={28} className="text-status-success" />
                </View>
                <Text className="font-extrabold text-lg text-foreground text-center">
                  Payment Recorded Successfully!
                </Text>
                <Text className="text-xs text-muted-foreground text-center mt-1">
                  ₹{amountToSettle.toLocaleString('en-IN')} received via {paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'} for {unitStr}. Notification has been dispatched to {residentStr}.
                </Text>

                <View className="mt-3 flex-row items-center gap-2">
                  <StatusBadge
                    label={willBeFullyPaid ? 'FULLY PAID' : 'PARTIALLY PAID'}
                    variant={willBeFullyPaid ? 'success' : 'warning'}
                  />
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
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close Settlement Sheet"
              >
                <Text className="font-bold text-sm text-foreground">Done</Text>
              </Button>
            </View>
          ) : (
            // Offline Payment Form (Cash & Bank Transfer, Full & Custom Amount)
            <View className="gap-4">
              {/* Unit & Due Summary Header */}
              <View className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs text-muted-foreground">Target Unit & Resident</Text>
                  <Text className="font-bold text-sm text-foreground">
                    {unitStr} ({residentStr})
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-muted-foreground">Current Outstanding</Text>
                  <Text className="text-base font-extrabold text-status-danger">
                    ₹{remainingDue.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* 1. Payment Method: Bank Transfer vs Cash */}
              <View className="gap-2">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  1. Select Payment Method
                </Text>

                <View className="flex-row gap-2.5">
                  {/* Cash Option */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleMethodChange('CASH')}
                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-500/10 border-emerald-500'
                        : 'bg-card border-border'
                    }`}
                  >
                    <View
                      className={`w-8 h-8 rounded-lg items-center justify-center ${
                        paymentMethod === 'CASH' ? 'bg-emerald-500/20' : 'bg-muted'
                      }`}
                    >
                      <Icon
                        as={Banknote}
                        size={18}
                        className={
                          paymentMethod === 'CASH'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                        }
                      />
                    </View>
                    <Text
                      className={`font-extrabold text-sm ${
                        paymentMethod === 'CASH'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      Cash
                    </Text>
                  </TouchableOpacity>

                  {/* Bank Transfer Option */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleMethodChange('BANK_TRANSFER')}
                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <View
                      className={`w-8 h-8 rounded-lg items-center justify-center ${
                        paymentMethod === 'BANK_TRANSFER' ? 'bg-primary/20' : 'bg-muted'
                      }`}
                    >
                      <Icon
                        as={Landmark}
                        size={18}
                        className={
                          paymentMethod === 'BANK_TRANSFER' ? 'text-primary' : 'text-muted-foreground'
                        }
                      />
                    </View>
                    <Text
                      className={`font-extrabold text-sm ${
                        paymentMethod === 'BANK_TRANSFER' ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Amount Mode: Full vs Custom */}
              <View className="gap-2.5">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  2. Settle Amount Mode
                </Text>

                {/* Option A: Full Amount */}
                <TouchableOpacity
                  onPress={() => setPaymentMode('FULL')}
                  activeOpacity={0.8}
                  className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                    paymentMode === 'FULL'
                      ? 'bg-status-success/10 border-status-success'
                      : 'bg-card border-border'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        paymentMode === 'FULL'
                          ? 'border-status-success bg-status-success'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {paymentMode === 'FULL' ? (
                        <Check size={12} className="text-primary-foreground" />
                      ) : null}
                    </View>
                    <View>
                      <Text className="font-bold text-sm text-foreground">Full Amount</Text>
                      <Text className="text-xs text-muted-foreground">
                        Clear total remaining balance
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base font-extrabold text-status-success">
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
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        paymentMode === 'CUSTOM'
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {paymentMode === 'CUSTOM' ? (
                        <Check size={12} className="text-primary-foreground" />
                      ) : null}
                    </View>
                    <View>
                      <Text className="font-bold text-sm text-foreground">Custom Amount</Text>
                      <Text className="text-xs text-muted-foreground">
                        Settle partial payment and maintain remaining dues
                      </Text>
                    </View>
                  </View>

                  {paymentMode === 'CUSTOM' ? (
                    <View className="mt-2 ps-8">
                      <TextInput
                        label="Enter Amount Being Paid (₹)"
                        required
                        value={customAmountStr}
                        onChangeText={setCustomAmountStr}
                        placeholder={`Max ₹${remainingDue.toLocaleString('en-IN')}`}
                        keyboardType="numeric"
                        inputClassName="font-bold text-base"
                        error={
                          isAmountTooHigh
                            ? `Cannot exceed current due of ₹${remainingDue.toLocaleString('en-IN')}`
                            : undefined
                        }
                      />
                    </View>
                  ) : null}
                </TouchableOpacity>

                {/* Dynamic Remaining Balance Calculation Box */}
                <View className="bg-muted/40 border border-border/60 rounded-xl p-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs text-muted-foreground">Paid Amount Now</Text>
                    <Text className="text-base font-extrabold text-primary">
                      ₹{amountToSettle.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-muted-foreground">Remaining Amount</Text>
                    <Text
                      className={`text-base font-extrabold ${
                        remainingAfterPayment > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-status-success'
                      }`}
                    >
                      ₹{remainingAfterPayment.toLocaleString('en-IN')} (
                      {willBeFullyPaid ? 'FULLY PAID' : 'PARTIAL'})
                    </Text>
                  </View>
                </View>
              </View>

              {/* 3. Reference and Notes */}
              <View className="gap-2.5">
                <TextInput
                  label="3. Reference / Receipt Number"
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                  placeholder={paymentMethod === 'CASH' ? 'CASH-YYYY-XXXXXX' : 'BANK-UTR-XXXXXX'}
                  leftIcon={FileText}
                />

                <TextInput
                  label="4. Internal Notes / Received From (Optional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Handed to facility manager / Cheque #1024"
                />
              </View>

              {/* Submit CTA */}
              <Button
                variant="default"
                size="lg"
                className="w-full flex-row items-center justify-center mt-1 bg-status-success active:bg-status-success/90"
                disabled={isFormInvalid || isSubmitting}
                loading={isSubmitting}
                onPress={() => setShowConfirmModal(true)}
                accessibilityRole="button"
                accessibilityLabel={`Record ${paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'} payment`}
              >
                <Text className="font-bold text-base text-primary-foreground me-1">
                  {`Record ${paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'} • ₹${amountToSettle.toLocaleString('en-IN')}`}
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
        title={`Confirm ${paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'} Settlement?`}
        message={`Confirm receiving ₹${amountToSettle.toLocaleString('en-IN')} via ${paymentMethod === 'CASH' ? 'Cash' : 'Bank Transfer'} for Invoice #${invNo}. Status will update to ${willBeFullyPaid ? 'PAID' : 'PARTIALLY PAID'} with Remaining Due of ₹${remainingAfterPayment.toLocaleString('en-IN')}. A user notification will be dispatched.`}
        confirmLabel="Confirm & Record"
        cancelLabel="Cancel"
        variant="info"
        loading={isSubmitting}
        onConfirm={handleRecordPayment}
        onCancel={() => setShowConfirmModal(false)}
      />
    </>
  );
}

export default AdminOfflineSettleSheet;
