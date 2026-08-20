import React, { useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Share2, Receipt, ChevronRight, Home, CreditCard } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import { generateInvoiceHtml } from '../utils/invoicePdfUtility';
import { InvoiceStatus, Invoice } from '../types';

export function PaymentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    invoiceId?: string;
    status?: string;
    paymentMethod?: string;
    reference?: string;
    amount?: string;
  }>();

  const invoiceId = params?.invoiceId || '';
  const paramMethod = params?.paymentMethod || '';
  const paramRef = params?.reference || '';

  const {
    activeDues,
    invoicesList,
    loadingStates,
    loadResidentDues,
  } = useBilling();

  // Socket listener for real-time verification updates
  useBillingSocket();

  useEffect(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  const handleRefresh = useCallback(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  // Match target invoice from Redux state
  const invoice: Invoice | null = useMemo(() => {
    if (!invoiceId) return null;

    const inGrid = invoicesList.find(
      (inv) => String(inv._id || (inv as any).id || '') === String(invoiceId) || String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inGrid) return inGrid;

    const recent = activeDues?.recentInvoices || [];
    const inRecent = recent.find(
      (inv) => String(inv._id || (inv as any).id || '') === String(invoiceId) || String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inRecent) return inRecent;

    const breakdown = activeDues?.unitBreakdown || [];
    const inBreakdown = breakdown.find(
      (inv) => String(inv.invoiceId || inv._id || (inv as any).id || '') === String(invoiceId) || String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inBreakdown) {
      return {
        _id: inBreakdown.invoiceId,
        invoiceNumber: inBreakdown.invoiceNumber,
        unitNumber: inBreakdown.unitNumber,
        totalDue: inBreakdown.totalDue,
        amount: inBreakdown.totalDue,
        billingPeriodString: inBreakdown.billingPeriodString,
        status: inBreakdown.status,
        dueDate: inBreakdown.dueDate,
      };
    }

    return null;
  }, [invoiceId, invoicesList, activeDues]);

  const invNo = invoice?.invoiceNumber || invoiceId || '—';
  const unitStr = invoice?.unitNumber ? `Villa ${invoice.unitNumber}` : 'Villa Unit';
  const periodStr = invoice?.billingPeriodString || 'Current Period';

  // Authoritative financial state
  const status: InvoiceStatus = invoice?.status || (params?.status as InvoiceStatus) || 'UNPAID';
  const statusVariant = getStatusVariant(status);

  const totalDue = invoice?.totalDue ?? invoice?.amount ?? (params?.amount ? parseFloat(params.amount) : 0);
  const paidAmount = invoice?.paidAmount ?? (status === 'PAID' ? totalDue : 0);
  const remainingDue = Math.max(0, totalDue - paidAmount);
  const methodStr = invoice?.paymentMethod || paramMethod || 'Digital Payment';
  const refStr = invoice?.offlineReference || paramRef || '—';

  const isPaid = status === 'PAID';
  const isPartial = status === 'PARTIALLY_PAID' || (paidAmount > 0 && remainingDue > 0);
  const isPending = status === 'VERIFICATION_PENDING';
  const isFailed = status === 'FAILED';
  const isCancelled = status === 'CANCELLED';

  // Native Receipt Share Handler
  const handleShareReceipt = async () => {
    try {
      const formattedAmount = `₹${(isPaid ? totalDue : paidAmount || totalDue).toLocaleString('en-IN')}`;
      await Share.share({
        title: `Payment Receipt #${invNo}`,
        message: `ManageMyGate Payment Receipt #${invNo}\nUnit: ${unitStr}\nAmount: ${formattedAmount}\nStatus: ${status.replace(/_/g, ' ')}\nMethod: ${methodStr}\nReference: ${refStr}`,
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err.message || 'Unable to share receipt.');
    }
  };

  return (
    <ScreenShell
      title="Payment Result"
      subtitle={`Invoice #${invNo}`}
      iconName="Receipt"
      loading={loadingStates.fetchDues && !invoice}
    >
      <View className="flex-1 bg-background justify-between">
        <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-8">

          {/* Hero Result Banner */}
          <View className="bg-card border border-border rounded-2xl p-6 items-center shadow-sm">
            {/* Header Icon */}
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
              isPaid ? 'bg-status-success/15' :
              isPartial ? 'bg-status-warning/15' :
              isPending ? 'bg-primary/10' :
              isFailed ? 'bg-destructive/15' : 'bg-muted'
            }`}>
              <Icon
                as={
                  isPaid ? CheckCircle2 :
                  isPartial ? Clock :
                  isPending ? Clock :
                  isFailed ? XCircle :
                  isCancelled ? AlertCircle : RefreshCw
                }
                size={36}
                className={
                  isPaid ? 'text-status-success' :
                  isPartial ? 'text-status-warning' :
                  isPending ? 'text-primary' :
                  isFailed ? 'text-destructive' : 'text-muted-foreground'
                }
              />
            </View>

            {/* Title */}
            <Text className="text-xl font-extrabold text-foreground text-center mb-1">
              {isPaid ? 'Payment Confirmed!' :
               isPartial ? 'Partial Payment Received' :
               isPending ? 'Submitted for Verification' :
               isFailed ? 'Payment Failed' :
               isCancelled ? 'Payment Cancelled' : 'Payment Status Unknown'}
            </Text>

            {/* Amount */}
            <Text className="text-3xl font-black text-foreground tracking-tight my-1">
              ₹{(isPaid ? totalDue : (paidAmount || totalDue)).toLocaleString('en-IN')}
            </Text>

            {/* Subtitle */}
            <Text className="text-xs text-muted-foreground text-center mt-1 px-4">
              {isPaid ? `Invoice #${invNo} for ${unitStr} has been fully settled.` :
               isPartial ? `Partially settled balance. Remaining due: ₹${remainingDue.toLocaleString('en-IN')}.` :
               isPending ? `Offline ref #${refStr} submitted and pending admin clearance verification.` :
               isFailed ? 'Your transaction could not be completed by the gateway.' :
               isCancelled ? 'No funds were deducted from your account.' :
               'Network status unknown. Please check payment status before retrying.'}
            </Text>

            <View className="mt-3">
              <StatusBadge label={status.replace(/_/g, ' ')} variant={statusVariant} dot />
            </View>
          </View>

          {/* Payment Summary Section */}
          <DetailSection title="Transaction Details">
            <DetailRow label="Invoice Number" value={invNo} copyable />
            <DetailRow label="Unit & Period" value={`${unitStr} (${periodStr})`} />
            <DetailRow label="Settled Amount" value={`₹${(isPaid ? totalDue : paidAmount).toLocaleString('en-IN')}`} />
            {remainingDue > 0 ? (
              <DetailRow label="Remaining Liability" value={`₹${remainingDue.toLocaleString('en-IN')}`} />
            ) : null}
            <DetailRow label="Payment Method" value={methodStr} />
            {refStr !== '—' ? (
              <DetailRow label="Reference / ID #" value={refStr} copyable />
            ) : null}
            <DetailRow
              label="Transaction Date"
              value={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
          </DetailSection>

        </ScrollView>

        {/* Action CTAs */}
        <View className="gap-2.5 p-4 pt-2 border-t border-border bg-background">
          {(isPaid || isPartial) ? (
            <Button
              variant="default"
              size="lg"
              className="w-full flex-row items-center justify-center"
              onPress={handleShareReceipt}
              accessibilityRole="button"
              accessibilityLabel="Share Digital Receipt"
            >
              <Icon as={Share2} size={18} className="text-primary-foreground me-2" />
              <Text className="font-bold text-base text-primary-foreground">Share Digital Receipt</Text>
            </Button>
          ) : null}

          {invoiceId ? (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onPress={() => router.push(`/(resident)/billing/invoice/${invoiceId}` as any)}
              accessibilityRole="button"
              accessibilityLabel="View Invoice Details"
            >
              View Invoice Details
            </Button>
          ) : null}

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onPress={() => router.push('/(resident)/billing/my-dues' as any)}
            accessibilityRole="button"
            accessibilityLabel="Return to My Dues Overview"
          >
            Return to My Dues
          </Button>
        </View>
      </View>
    </ScreenShell>
  );
}

export default PaymentResultScreen;
