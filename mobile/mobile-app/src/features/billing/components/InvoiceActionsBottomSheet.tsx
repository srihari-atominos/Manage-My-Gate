import React, { useState, useEffect, useMemo } from 'react';
import { View, Share, Alert, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { Clock, Check, Banknote, Landmark, XCircle, CheckCircle2, ShieldAlert } from 'lucide-react-native';
import { Invoice } from '../types';

export interface InvoiceActionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onApproveOffline?: (invoiceId: string, options?: { amount?: number; settlementType?: 'FULL' | 'CUSTOM' }) => Promise<any>;
  onRejectOffline?: (invoiceId: string, reason: string) => Promise<any>;
  onSettleOfflineModal?: (invoice: Invoice) => void;
}

export function InvoiceActionsBottomSheet({
  visible,
  onClose,
  invoice,
  onApproveOffline,
  onRejectOffline,
  onSettleOfflineModal,
}: InvoiceActionsBottomSheetProps) {
  const [approvalMode, setApprovalMode] = useState<'FULL' | 'CUSTOM'>('FULL');
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Derived figures
  const totalAmount = invoice?.totalDue ?? invoice?.amount ?? 0;
  const paidAmount = invoice?.paidAmount ?? 0;
  const remainingDue = (invoice as any)?.outstandingAmount !== undefined
    ? (invoice as any).outstandingAmount
    : Math.max(0, totalAmount - paidAmount);

  const submittedOfflineAmount = (invoice as any)?.offlineAmount ?? remainingDue;

  useEffect(() => {
    if (visible && invoice) {
      // If submitted amount is less than remaining due, default to custom amount prefilled with submitted amount
      if (submittedOfflineAmount > 0 && submittedOfflineAmount < remainingDue) {
        setApprovalMode('CUSTOM');
        setCustomAmountStr(String(submittedOfflineAmount));
      } else {
        setApprovalMode('FULL');
        setCustomAmountStr(remainingDue > 0 ? String(remainingDue) : '');
      }
      setShowConfirmModal(false);
      setShowRejectModal(false);
      setRejectReason('');
      setIsApproving(false);
      setIsRejecting(false);
    }
  }, [visible, invoice, remainingDue, submittedOfflineAmount]);

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : '—';
  const residentStr = invoice.targetUser || 'Resident';

  const amountToApprove = useMemo(() => {
    if (approvalMode === 'FULL') return remainingDue;
    const parsed = parseFloat(customAmountStr);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [approvalMode, customAmountStr, remainingDue]);

  const remainingAfterApproval = Math.max(0, remainingDue - amountToApprove);
  const willBeFullyPaid = remainingAfterApproval === 0;

  const status = invoice.status || 'UNPAID';
  const isPendingVerification = status === 'VERIFICATION_PENDING';
  const isUnpaid = status === 'UNPAID' || status === 'OVERDUE' || status === 'PARTIALLY_PAID';
  const refStr = invoice.offlineReference || '—';
  const methodStr = (invoice.paymentMethod || 'BANK_TRANSFER').toUpperCase();
  const isCash = methodStr === 'CASH';

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        title: `Invoice Statement #${invNo}`,
        message: `ManageMyGate Statement #${invNo}\nUnit: ${unitStr}\nAmount: ₹${totalAmount.toLocaleString('en-IN')}\nStatus: ${status.replace(/_/g, ' ')}\nMethod: ${methodStr}\nRef: ${refStr}`,
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err.message || 'Unable to share statement.');
    }
  };

  const handleConfirmApprove = async () => {
    if (!onApproveOffline || !invoice._id || isApproving || amountToApprove <= 0) return;
    setIsApproving(true);
    try {
      await onApproveOffline(invoice._id, {
        amount: amountToApprove,
        settlementType: willBeFullyPaid ? 'FULL' : 'CUSTOM',
      });
      setIsApproving(false);
      setShowConfirmModal(false);
      onClose();
      Alert.alert(
        'Payment Verified & Recorded',
        `Settled ₹${amountToApprove.toLocaleString('en-IN')} via ${isCash ? 'Cash' : 'Bank Transfer'} for Invoice #${invNo}. Status is now ${willBeFullyPaid ? 'PAID' : 'PARTIALLY_PAID'}.`
      );
    } catch (err: any) {
      setIsApproving(false);
      setShowConfirmModal(false);
      const isConflict = err?.statusCode === 409 || String(err).includes('409') || String(err).includes('already');
      Alert.alert(
        isConflict ? 'Already Processed' : 'Approval Failed',
        isConflict
          ? `Invoice #${invNo} has already been updated or settled by another administrator.`
          : (err?.message || err || 'Could not clear offline payment.')
      );
    }
  };

  const handleConfirmReject = async () => {
    if (!invoice._id || isRejecting) return;
    setIsRejecting(true);
    try {
      if (onRejectOffline) {
        await onRejectOffline(invoice._id, rejectReason.trim());
      }
      setIsRejecting(false);
      setShowRejectModal(false);
      onClose();
      Alert.alert('Submission Rejected', `Offline payment for Invoice #${invNo} has been rejected.`);
    } catch (err: any) {
      setIsRejecting(false);
      setShowRejectModal(false);
      Alert.alert('Rejection Failed', err?.message || err || 'Could not reject payment submission.');
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={`Invoice Review • #${invNo}`}>
        <View className="py-2 gap-4">

          {/* Pending Verification Notice */}
          {isPendingVerification ? (
            <View className={`border rounded-xl p-4 flex-row items-start ${
              isCash ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <Icon as={isCash ? Banknote : Landmark} size={22} className={`me-3 mt-0.5 ${
                isCash ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <View className="flex-1">
                <Text className={`text-sm font-bold ${
                  isCash ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'
                }`}>
                  {isCash ? 'Cash Payment Clearance Pending' : 'Bank Transfer Clearance Pending'}
                </Text>
                <Text className={`text-xs mt-1 ${
                  isCash ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                }`}>
                  Resident submitted ₹{submittedOfflineAmount.toLocaleString('en-IN')} via {isCash ? 'Cash' : 'Bank Transfer'} (Ref: #{refStr}). Select settlement option below.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Admin Settlement Option Selector (for pending verification) */}
          {isPendingVerification ? (
            <View className="bg-card border border-border rounded-xl p-4 gap-3">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Admin Verification Options
              </Text>

              {/* Option 1: Mark as Paid (Full Amount) */}
              <TouchableOpacity
                onPress={() => setApprovalMode('FULL')}
                activeOpacity={0.8}
                className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                  approvalMode === 'FULL'
                    ? 'bg-status-success/10 border-status-success'
                    : 'bg-muted/40 border-border'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                    approvalMode === 'FULL' ? 'border-status-success bg-status-success' : 'border-muted-foreground'
                  }`}>
                    {approvalMode === 'FULL' ? <Check size={12} className="text-primary-foreground" /> : null}
                  </View>
                  <View>
                    <Text className="font-bold text-sm text-foreground">Mark as Paid (Full Amount)</Text>
                    <Text className="text-xs text-muted-foreground">Clears full remaining due of ₹{remainingDue.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
                <Text className="text-sm font-extrabold text-status-success">
                  ₹{remainingDue.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>

              {/* Option 2: Custom Amount */}
              <TouchableOpacity
                onPress={() => setApprovalMode('CUSTOM')}
                activeOpacity={0.8}
                className={`p-3.5 rounded-xl border ${
                  approvalMode === 'CUSTOM'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/40 border-border'
                }`}
              >
                <View className="flex-row items-center gap-3 mb-1">
                  <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                    approvalMode === 'CUSTOM' ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {approvalMode === 'CUSTOM' ? <Check size={12} className="text-primary-foreground" /> : null}
                  </View>
                  <View>
                    <Text className="font-bold text-sm text-foreground">Custom Amount</Text>
                    <Text className="text-xs text-muted-foreground">Approve partial amount and keep remaining dues active</Text>
                  </View>
                </View>

                {approvalMode === 'CUSTOM' ? (
                  <View className="mt-2 ps-8">
                    <TextInput
                      label="Enter Custom Amount to Settle (₹)"
                      required
                      value={customAmountStr}
                      onChangeText={setCustomAmountStr}
                      placeholder={`Max ₹${remainingDue.toLocaleString('en-IN')}`}
                      keyboardType="numeric"
                      inputClassName="font-bold text-base"
                    />
                  </View>
                ) : null}
              </TouchableOpacity>

              {/* Remaining calculation preview */}
              <View className="bg-muted/30 border border-border/60 rounded-lg p-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs text-muted-foreground">Clearing Amount</Text>
                  <Text className="text-base font-extrabold text-foreground">
                    ₹{amountToApprove.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-muted-foreground">Remaining Dues After Approval</Text>
                  <Text className={`text-base font-extrabold ${remainingAfterApproval > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-status-success'}`}>
                    ₹{remainingAfterApproval.toLocaleString('en-IN')} ({willBeFullyPaid ? 'PAID' : 'PARTIAL'})
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Detailed Invoice & Payment Section */}
          <DetailSection title="Transaction Details">
            <DetailRow
              label="Assessment Purpose"
              value={invoice.assessmentName || (invoice as any).snapshot?.assessmentName || 'Monthly Maintenance Assessment'}
            />
            <DetailRow label="Unit & Resident" value={`${unitStr} (${residentStr})`} />
            <DetailRow label="Billing Period" value={invoice.billingPeriodString || 'Current'} />
            <DetailRow label="Invoice Total" value={`₹${totalAmount.toLocaleString('en-IN')}`} />
            {paidAmount > 0 ? (
              <DetailRow label="Paid Amount" value={`₹${paidAmount.toLocaleString('en-IN')}`} />
            ) : null}
            {remainingDue > 0 ? (
              <DetailRow label="Remaining Liability" value={`₹${remainingDue.toLocaleString('en-IN')}`} />
            ) : null}
            <DetailRow label="Payment Method" value={methodStr} />
            {refStr !== '—' ? (
              <DetailRow label="Offline Reference #" value={refStr} copyable />
            ) : null}
            <DetailRow label="Status" value={status.replace(/_/g, ' ')} />
          </DetailSection>

          {/* Action CTAs */}
          <View className="gap-2.5 pt-2">
            {isPendingVerification && onApproveOffline ? (
              <View className="gap-2">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full bg-status-success active:bg-status-success/90 flex-row items-center justify-center gap-1.5"
                  disabled={isApproving || isRejecting || amountToApprove <= 0}
                  loading={isApproving}
                  onPress={() => setShowConfirmModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Approve and Clear Offline Payment"
                >
                  <Icon as={CheckCircle2} size={18} className="text-primary-foreground" />
                  <Text className="font-bold text-base text-primary-foreground">
                    {willBeFullyPaid
                      ? `Mark as Paid • Full ₹${amountToApprove.toLocaleString('en-IN')}`
                      : `Approve Custom Amount • ₹${amountToApprove.toLocaleString('en-IN')}`}
                  </Text>
                </Button>

                {onRejectOffline ? (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full border-destructive/40 text-destructive active:bg-destructive/10"
                    disabled={isApproving || isRejecting}
                    loading={isRejecting}
                    onPress={() => setShowRejectModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Reject Payment Submission"
                  >
                    <Text className="text-destructive font-bold text-sm">Reject Submission</Text>
                  </Button>
                ) : null}
              </View>
            ) : null}

            {isUnpaid && !isPendingVerification && onSettleOfflineModal ? (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onPress={() => {
                  onClose();
                  onSettleOfflineModal(invoice);
                }}
                accessibilityRole="button"
                accessibilityLabel="Record Offline Settlement"
              >
                Record Offline Settlement
              </Button>
            ) : null}

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onPress={handleShareReceipt}
              accessibilityRole="button"
              accessibilityLabel="Share or Print Statement"
            >
              Share / Print Statement
            </Button>
          </View>
        </View>
      </BottomSheet>

      {/* Confirmation Modal for Clearance */}
      <ConfirmationModal
        visible={showConfirmModal}
        title={willBeFullyPaid ? 'Mark Invoice as Paid?' : 'Approve Custom Amount?'}
        message={`Confirm approval of ₹${amountToApprove.toLocaleString('en-IN')} via ${isCash ? 'Cash' : 'Bank Transfer'} (Ref #${refStr}) for Invoice #${invNo}. Status will update to ${willBeFullyPaid ? 'PAID' : 'PARTIALLY_PAID (Remaining: ₹' + remainingAfterApproval.toLocaleString('en-IN') + ')'}.`}
        confirmLabel={willBeFullyPaid ? 'Mark as Paid' : 'Approve Partial'}
        cancelLabel="Cancel"
        variant="info"
        loading={isApproving}
        onConfirm={handleConfirmApprove}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Confirmation Modal for Payment Rejection */}
      <ConfirmationModal
        visible={showRejectModal}
        title="Reject Payment Submission?"
        message={`Are you sure you want to reject the payment submission (Ref #${refStr}) for Invoice #${invNo}? The invoice will revert to its previous unpaid balance status.`}
        confirmLabel="Reject Submission"
        cancelLabel="Cancel"
        variant="danger"
        loading={isRejecting}
        onConfirm={handleConfirmReject}
        onCancel={() => setShowRejectModal(false)}
      />
    </>
  );
}

export default InvoiceActionsBottomSheet;

