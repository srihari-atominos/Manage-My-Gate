import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Receipt, Calendar, Clock, ChevronRight, ShieldAlert } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import { InvoiceStatus, Invoice } from '../types';
import { PaymentCheckoutSheet } from '../components/PaymentCheckoutSheet';

export function InvoiceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const invoiceId = params?.id || '';

  const [showCheckout, setShowCheckout] = useState(false);

  const {
    activeDues,
    invoicesList,
    loadingStates,
    error,
    loadResidentDues,
    resetBillingError,
  } = useBilling();

  // Socket listener for real-time invoice status updates
  useBillingSocket();

  useEffect(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  const handleRefresh = useCallback(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  // Find invoice from Redux activeDues breakdown, recentInvoices, or invoicesList
  const invoice: Invoice | null = useMemo(() => {
    if (!invoiceId) return null;

    // 1. Search in invoicesList
    const inGrid = invoicesList.find(
      (inv) => String(inv._id || (inv as any).id || '') === String(invoiceId) || String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inGrid) return inGrid;

    // 2. Search in activeDues.recentInvoices
    const recent = activeDues?.recentInvoices || [];
    const inRecent = recent.find(
      (inv) => String(inv._id || (inv as any).id || '') === String(invoiceId) || String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inRecent) return inRecent;

    // 3. Search in activeDues.unitBreakdown
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

  if (!invoice && !loadingStates.fetchDues) {
    return (
      <ScreenShell title="Invoice Details" iconName="Receipt">
        <View className="flex-1 items-center justify-center p-6 bg-background">
          <EmptyState
            icon={ShieldAlert}
            title="Invoice Not Found"
            description="The requested maintenance invoice could not be located or has been removed."
            actionLabel="Back to My Dues"
            onAction={() => router.back()}
          />
        </View>
      </ScreenShell>
    );
  }

  const invNo = invoice?.invoiceNumber || invoice?._id || '—';
  const unitStr = invoice?.unitNumber ? `Villa ${invoice.unitNumber}` : 'Villa Unit';
  const periodStr = invoice?.billingPeriodString || 'Current Billing Cycle';
  const residentStr = invoice?.targetUser || 'Resident Owner';
  const dueDateStr = invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—';

  // Charge breakdown figures
  const snapshot = (invoice as any)?.financialSnapshot || {};
  const currentCharge = snapshot.currentCharge ?? invoice?.amount ?? invoice?.totalDue ?? 0;
  const previousOutstanding = snapshot.previousOutstanding ?? 0;
  const lateFee = snapshot.lateFee ?? 0;

  const totalDue = invoice?.totalDue ?? (currentCharge + previousOutstanding + lateFee);
  const paidAmount = invoice?.paidAmount ?? 0;
  const remainingDue = Math.max(0, totalDue - paidAmount);

  // Status variants
  const status: InvoiceStatus = invoice?.status || 'UNPAID';
  const statusVariant = getStatusVariant(status);
  const statusLabel = status.replace(/_/g, ' ');

  const isPaid = status === 'PAID';
  const isPendingVerification = status === 'VERIFICATION_PENDING';
  const isCancelled = status === 'CANCELLED';
  const isPartial = status === 'PARTIALLY_PAID' || (paidAmount > 0 && remainingDue > 0);

  // Payment progress percentage
  const paidPercentage = totalDue > 0 ? Math.min(100, Math.round((paidAmount / totalDue) * 100)) : (isPaid ? 100 : 0);

  return (
    <ScreenShell
      title={`Invoice #${invNo}`}
      subtitle={`${unitStr} • ${periodStr}`}
      iconName="Receipt"
      loading={loadingStates.fetchDues && !invoice}
    >
      <View className="flex-1 bg-background">
        {/* Error Banner Container */}
        {error ? (
          <View className="mb-2">
            <ErrorBanner
              message={error}
              onDismiss={() => resetBillingError()}
            />
          </View>
        ) : null}

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 pb-28"
          refreshControl={
            <RefreshControl
              refreshing={loadingStates.fetchDues}
              onRefresh={handleRefresh}
            />
          }
        >
          {/* Hero Invoice Summary Card */}
          <View className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center me-3">
                  <Icon as={Receipt} size={20} className="text-primary" />
                </View>
                <View>
                  <Text className="text-foreground font-bold text-base">{unitStr}</Text>
                  <Text className="text-muted-foreground text-xs">{periodStr}</Text>
                </View>
              </View>

              <StatusBadge label={statusLabel} variant={statusVariant} dot />
            </View>

            {/* Remaining Due Hero Figure */}
            <View className="bg-muted/40 border border-border/60 rounded-xl p-4 mb-3">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                {isPaid ? 'Total Settled Amount' : 'Remaining Outstanding Liability'}
              </Text>
              <Text className="text-3xl font-extrabold text-foreground tracking-tight">
                ₹{(isPaid ? totalDue : remainingDue).toLocaleString('en-IN')}
              </Text>
              {dueDateStr !== '—' ? (
                <View className="flex-row items-center mt-2">
                  <Icon as={Calendar} size={12} className="text-muted-foreground me-1" />
                  <Text className="text-xs text-muted-foreground">Due Date: {dueDateStr}</Text>
                </View>
              ) : null}
            </View>

            {/* Payment Progress Bar for Partial Payments */}
            {isPartial || paidAmount > 0 ? (
              <View className="mt-1">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs text-muted-foreground font-medium">Payment Settlement Progress</Text>
                  <Text className="text-xs font-bold text-primary">{paidPercentage}% Paid</Text>
                </View>
                <ProgressBar progress={paidPercentage} className="h-2 rounded-full" />
              </View>
            ) : null}
          </View>

          {/* Verification Pending Info Notice */}
          {isPendingVerification ? (
            <View className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex-row items-start">
              <Icon as={Clock} size={20} className="text-primary me-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  Payment Verification Pending
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">
                  Your offline cheque / NEFT reference has been submitted. The admin team is currently verifying the payment clearance.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Itemized Financial Breakdown Section */}
          <DetailSection title="Financial Charge Breakdown">
            <DetailRow label="Current Month Maintenance Charge" value={`₹${currentCharge.toLocaleString('en-IN')}`} />
            {previousOutstanding > 0 ? (
              <DetailRow label="Previous Outstanding Arrears" value={`₹${previousOutstanding.toLocaleString('en-IN')}`} />
            ) : null}
            {lateFee > 0 ? (
              <DetailRow label="Late Fee Penalty" value={`₹${lateFee.toLocaleString('en-IN')}`} />
            ) : null}
            <DetailRow label="Gross Total Billed" value={`₹${totalDue.toLocaleString('en-IN')}`} />
            {paidAmount > 0 ? (
              <DetailRow label="Less Amount Already Settled" value={`- ₹${paidAmount.toLocaleString('en-IN')}`} />
            ) : null}
            <DetailRow label="Net Outstanding Balance" value={`₹${remainingDue.toLocaleString('en-IN')}`} />
          </DetailSection>

          {/* Invoice Information & Metadata Section */}
          <DetailSection title="Invoice Information">
            <DetailRow label="Invoice Number" value={invNo} copyable />
            <DetailRow label="Resident Account" value={residentStr} />
            <DetailRow label="Unit / Villa" value={unitStr} />
            <DetailRow label="Billing Cycle" value={periodStr} />
            <DetailRow label="Payment Status" value={statusLabel} />
            {invoice?.paymentMethod ? (
              <DetailRow label="Payment Method" value={invoice.paymentMethod} />
            ) : null}
            {invoice?.offlineReference ? (
              <DetailRow label="Offline Cheque / Ref #" value={invoice.offlineReference} copyable />
            ) : null}
          </DetailSection>
        </ScrollView>

        {/* Primary Payment CTA (Active only when unpaid & not pending clearance) */}
        {!isPaid && !isCancelled && !isPendingVerification && remainingDue > 0 ? (
          <View className="absolute bottom-0 left-0 right-0 bg-background/95 border-t border-border p-4 shadow-lg">
            <Button
              variant="default"
              size="lg"
              className="w-full flex-row items-center justify-center"
              onPress={() => setShowCheckout(true)}
              accessibilityRole="button"
              accessibilityLabel={`Proceed to Pay Remaining Dues ₹${remainingDue.toLocaleString('en-IN')}`}
            >
              <Text className="font-bold text-base text-primary-foreground me-1">
                Pay Remaining Dues • ₹{remainingDue.toLocaleString('en-IN')}
              </Text>
              <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
            </Button>
          </View>
        ) : null}

        {/* Phase 3 Payment Checkout Sheet */}
        <PaymentCheckoutSheet
          visible={showCheckout}
          onClose={() => setShowCheckout(false)}
          invoice={invoice}
          onPaymentSuccess={() => {
            loadResidentDues();
          }}
        />
      </View>
    </ScreenShell>
  );
}

export default InvoiceDetailsScreen;


