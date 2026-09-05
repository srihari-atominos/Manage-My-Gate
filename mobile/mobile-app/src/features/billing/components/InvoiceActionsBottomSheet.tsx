import React, { useState, useEffect } from 'react';
import { View, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { Button } from '@/components/common/Button';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { Clock, Bell, FileText } from 'lucide-react-native';
import { Invoice } from '../types';
import billingService from '../services/billingService';

export interface InvoiceActionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onApproveOffline?: (invoiceId: string) => Promise<any>;
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
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowConfirmModal(false);
      setShowRejectModal(false);
      setRejectReason('');
      setIsApproving(false);
      setIsRejecting(false);
      setIsSendingReminder(false);
    }
  }, [visible]);

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : '—';
  const residentStr = invoice.targetUser || 'Resident';
  const totalAmount = invoice.totalDue ?? invoice.amount ?? 0;
  const paidAmount = invoice.paidAmount ?? 0;
  const remainingDue = Math.max(0, totalAmount - paidAmount);
  const submittedAmount = (invoice as any).offlineAmount ?? remainingDue;
  const formattedAmount = `₹${(submittedAmount || totalAmount).toLocaleString('en-IN')}`;

  const status = invoice.status || 'UNPAID';
  const isPendingVerification = status === 'VERIFICATION_PENDING';
  const isUnpaid = status === 'UNPAID' || status === 'OVERDUE';
  const refStr = invoice.offlineReference || '—';
  const methodStr = invoice.paymentMethod || 'BANK_TRANSFER';

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        title: `Invoice Receipt ${invNo}`,
        message: `ManageMyGate Invoice #${invNo}\nUnit: ${unitStr}\nAmount: ${formattedAmount}\nStatus: ${status.replace(/_/g, ' ')}\nPayment Ref: ${refStr}`,
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err.message || 'Unable to share receipt.');
    }
  };

  const handleConfirmApprove = async () => {
    if (!onApproveOffline || !invoice._id || isApproving) return;
    setIsApproving(true);
    try {
      await onApproveOffline(invoice._id);
      setIsApproving(false);
      setShowConfirmModal(false);
      onClose();
      Alert.alert('Payment Approved', `Offline payment ref #${refStr} for Invoice #${invNo} has been cleared and marked as PAID.`);
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
      } else {
        // Fallback placeholder rejection log
        console.warn('onRejectOffline prop not passed, logging fallback');
      }
      setIsRejecting(false);
      setShowRejectModal(false);
      onClose();
      Alert.alert('Submission Rejected', `Offline submission for Invoice #${invNo} has been rejected.`);
    } catch (err: any) {
      setIsRejecting(false);
      setShowRejectModal(false);
      Alert.alert('Rejection Failed', err?.message || err || 'Could not reject payment submission.');
    }
  };

  const handleSendInAppReminder = async () => {
    if (!invoice._id || isSendingReminder) return;
    setIsSendingReminder(true);
    try {
      await billingService.sendInvoiceReminder(invoice._id);
      setIsSendingReminder(false);
      Alert.alert(
        'Reminder Sent',
        `In-app notification reminder sent to ${residentStr} for Invoice #${invNo}.`
      );
    } catch (err: any) {
      setIsSendingReminder(false);
      Alert.alert('Reminder Failed', err?.message || err || 'Could not send reminder notification.');
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={`Invoice Review • #${invNo}`}>
        <View className="py-2 gap-4">

          {/* Pending Verification Alert Notice */}
          {isPendingVerification ? (
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex-row items-start">
              <Icon as={Clock} size={20} className="text-amber-600 dark:text-amber-400 me-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Payment Verification Pending
                </Text>
                <Text className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Resident submitted payment reference #{refStr} for verification. Review details below before clearing.
                </Text>
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
            {/* Direct Link to Child Invoice Details Screen */}
            <Button
              variant="outline"
              size="lg"
              className="w-full border-primary/40"
              leftIcon={FileText}
              onPress={() => {
                onClose();
                router.push(`/(resident)/billing/invoice/${invoice._id || invoice.invoiceNumber}` as any);
              }}
              accessibilityRole="button"
              accessibilityLabel="View Full Invoice Statement and Itemized Breakdown"
            >
              View Full Invoice Statement
            </Button>

            {isPendingVerification && onApproveOffline ? (
              <Button
                variant="default"
                size="lg"
                className="w-full bg-status-success active:bg-status-success/90"
                disabled={isApproving || isRejecting}
                loading={isApproving}
                onPress={() => setShowConfirmModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Approve and Clear Offline Payment"
              >
                Approve & Clear Payment
              </Button>
            ) : null}

            {isPendingVerification && onRejectOffline ? (
              <Button
                variant="outline"
                size="lg"
                className="w-full border-destructive/50"
                textClassName="text-destructive font-bold"
                disabled={isApproving || isRejecting}
                loading={isRejecting}
                onPress={() => setShowRejectModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Reject Offline Payment Submission"
              >
                Reject Submission
              </Button>
            ) : null}

            {isUnpaid && onSettleOfflineModal ? (
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

            {status !== 'PAID' ? (
              <Button
                variant="outline"
                size="lg"
                className="w-full border-primary/50"
                textClassName="text-primary font-bold"
                leftIcon={Bell}
                disabled={isApproving || isRejecting || isSendingReminder}
                loading={isSendingReminder}
                onPress={handleSendInAppReminder}
                accessibilityRole="button"
                accessibilityLabel="Send in-app reminder to resident"
              >
                Send In-App Reminder
              </Button>
            ) : null}

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onPress={handleShareReceipt}
              accessibilityRole="button"
              accessibilityLabel="Share or Print Receipt"
            >
              Share / Print Receipt
            </Button>
          </View>
        </View>
      </BottomSheet>

      {/* Confirmation Modal for Cheque Clearance */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Payment Clearance?"
        message={`Are you sure you want to clear offline payment ref #${refStr} of ${formattedAmount} for Invoice #${invNo}? This action will verify clearance and mark status as PAID in community ledgers.`}
        confirmLabel="Approve & Clear"
        cancelLabel="Cancel"
        variant="info"
        loading={isApproving}
        onConfirm={handleConfirmApprove}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Confirmation Modal for Cheque Rejection */}
      <ConfirmationModal
        visible={showRejectModal}
        title="Reject Payment Submission?"
        message={`Are you sure you want to reject the offline payment submission ref #${refStr} for Invoice #${invNo}? The invoice will revert to its previous unpaid balance status.`}
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

