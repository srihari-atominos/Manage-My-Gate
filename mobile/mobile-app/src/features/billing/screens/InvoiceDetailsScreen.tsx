import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  Receipt,
  Calendar,
  Clock,
  ChevronRight,
  ShieldAlert,
  Download,
  Share2,
  FileText,
} from 'lucide-react-native';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import { billingService } from '../services/billingService';
import { InvoiceStatus, Invoice } from '../types';
import { PaymentCheckoutSheet } from '../components/PaymentCheckoutSheet';
import { generateInvoiceHtml, exportInvoiceHtmlDocument } from '../utils/invoicePdfUtility';

export function InvoiceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const invoiceId = params?.id || '';

  const [showCheckout, setShowCheckout] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fallbackInvoice, setFallbackInvoice] = useState<Invoice | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

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

  // Find invoice from Redux state
  const reduxInvoice: Invoice | null = useMemo(() => {
    if (!invoiceId) return null;

    // 1. Search in invoicesList
    const inGrid = invoicesList.find(
      (inv) =>
        String(inv._id || (inv as any).id || '') === String(invoiceId) ||
        String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inGrid) return inGrid;

    // 2. Search in activeDues.recentInvoices
    const recent = activeDues?.recentInvoices || [];
    const inRecent = recent.find(
      (inv) =>
        String(inv._id || (inv as any).id || '') === String(invoiceId) ||
        String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inRecent) return inRecent;

    // 3. Search in activeDues.unitBreakdown
    const breakdown = activeDues?.unitBreakdown || [];
    const inBreakdown = breakdown.find(
      (inv) =>
        String(inv.invoiceId || inv._id || (inv as any).id || '') === String(invoiceId) ||
        String(inv.invoiceNumber || '') === String(invoiceId)
    );
    if (inBreakdown) {
      const totalDue = inBreakdown.totalDue || 0;
      const paidAmount = inBreakdown.paidAmount || 0;
      const outstandingAmount = inBreakdown.outstandingAmount ?? Math.max(0, totalDue - paidAmount);
      return {
        _id: inBreakdown.invoiceId,
        invoiceNumber: inBreakdown.invoiceNumber,
        unitNumber: inBreakdown.unitNumber,
        totalDue,
        paidAmount,
        outstandingAmount,
        amount: totalDue,
        billingPeriodString: inBreakdown.billingPeriodString,
        status: inBreakdown.status,
        dueDate: inBreakdown.dueDate,
      };
    }

    return null;
  }, [invoiceId, invoicesList, activeDues]);

  // Fallback single-invoice API fetch if not found in Redux dues cache
  useEffect(() => {
    const fetchSingleInvoice = async () => {
      if (!invoiceId || reduxInvoice || fallbackInvoice) return;
      try {
        setFallbackLoading(true);
        const data = await billingService.getInvoiceById(invoiceId);
        if (data) {
          setFallbackInvoice(data);
        }
      } catch (err) {
        console.log('Direct invoice fetch completed or unavailable', err);
      } finally {
        setFallbackLoading(false);
      }
    };

    fetchSingleInvoice();
  }, [invoiceId, reduxInvoice, fallbackInvoice]);

  const invoice = reduxInvoice || fallbackInvoice;
  const { user } = useAuth();

  const dynamicCommunityName = useMemo(() => {
    return (
      (invoice as any)?.communityName ||
      (invoice as any)?.orgName ||
      (invoice as any)?.organizationName ||
      (invoice as any)?.organization?.name ||
      (user as any)?.organizationName ||
      (user as any)?.activeOrganizationName ||
      (user as any)?.orgName ||
      (user as any)?.communityName ||
      (user as any)?.communityOrg ||
      (user as any)?.organization?.name ||
      'Community Workspace'
    );
  }, [invoice, user]);

  const handleRefresh = useCallback(() => {
    loadResidentDues();
    if (invoiceId) {
      billingService.getInvoiceById(invoiceId).then(setFallbackInvoice).catch(() => {});
    }
  }, [loadResidentDues, invoiceId]);

  // Export / Download PDF HTML statement
  const handleExportPdf = async (action: 'download' | 'print' = 'download') => {
    if (!invoice) return;
    try {
      setIsExporting(true);
      const invNum = invoice.invoiceNumber || invoice._id || 'INVOICE';
      const html = generateInvoiceHtml(invoice, {
        communityName: dynamicCommunityName,
        residentName: invoice.targetUser || (user as any)?.name || (user as any)?.fullName || 'Resident Owner',
      });

      await exportInvoiceHtmlDocument(
        html,
        `Invoice_${invNum}.html`,
        `Invoice Statement #${invNum}`,
        { action }
      );
    } catch (err) {
      console.error('Failed to export invoice document', err);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = (loadingStates.fetchDues && !invoice) || (fallbackLoading && !invoice);

  if (!invoice && !isLoading) {
    return (
      <ScreenShell title="Invoice Details" iconName="Receipt">
        <View className="flex-1 items-center justify-center p-6 bg-background">
          <EmptyState
            icon={ShieldAlert}
            title="Invoice Not Found"
            description="The requested maintenance invoice could not be located or has been archived."
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
  const invoiceDateStr = invoice?.createdAt
    ? new Date(invoice.createdAt).toLocaleDateString('en-IN')
    : '—';

  // Itemized Charge breakdown figures
  const snapshot = (invoice as any)?.financialSnapshot || (invoice as any)?.snapshot || {};
  const currentCharge = snapshot.currentCharge ?? (invoice as any)?.currentCharge ?? invoice?.amount ?? invoice?.totalDue ?? 0;
  const previousOutstanding = snapshot.previousOutstanding ?? (invoice as any)?.previousOutstanding ?? 0;
  const lateFee = snapshot.lateFee ?? (invoice as any)?.lateFeeAmount ?? 0;
  const taxAmount = snapshot.taxAmount ?? (invoice as any)?.taxAmount ?? 0;

  const totalDue = invoice?.totalDue ?? (currentCharge + previousOutstanding + lateFee + taxAmount);
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
  const paidPercentage =
    totalDue > 0
      ? Math.min(100, Math.round((paidAmount / totalDue) * 100))
      : isPaid
      ? 100
      : 0;

  return (
    <ScreenShell
      title={`Invoice #${invNo}`}
      subtitle={`${unitStr} • ${periodStr}`}
      iconName="Receipt"
      headerRight={
        invoice ? (
          <Button
            variant="outline"
            size="sm"
            onPress={() => handleExportPdf('download')}
            disabled={isExporting}
            className="flex-row items-center gap-1.5 border-border bg-card"
            accessibilityRole="button"
            accessibilityLabel="Export or Download PDF Invoice"
          >
            <Icon as={isExporting ? FileText : Download} size={14} className="text-foreground" />
            <Text className="text-xs font-bold text-foreground">
              {isExporting ? 'Exporting...' : 'PDF'}
            </Text>
          </Button>
        ) : null
      }
    >
      <View className="flex-1 bg-background">
        {/* Error Banner Container */}
        {error ? (
          <View className="mb-2 px-4">
            <ErrorBanner message={error} onDismiss={() => resetBillingError()} />
          </View>
        ) : null}

        {isLoading ? (
          <View className="p-4">
            <SkeletonLoader count={3} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerClassName="gap-4 pb-28"
            refreshControl={
              <RefreshControl
                refreshing={loadingStates.fetchDues || fallbackLoading}
                onRefresh={handleRefresh}
              />
            }
          >
            {/* Hero Invoice Summary Card */}
            <View className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1 me-2">
                  <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center me-3">
                    <Icon as={Receipt} size={20} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-bold text-base">{unitStr}</Text>
                    <Text className="text-muted-foreground text-xs">{periodStr}</Text>
                  </View>
                </View>

                <StatusBadge label={statusLabel} variant={statusVariant} dot />
              </View>

              {/* Outstanding / Total Amount Hero Box */}
              <View className="bg-muted/40 border border-border/60 rounded-xl p-4 mb-3">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  {isPaid ? 'Total Settled Amount' : 'Remaining Outstanding Liability'}
                </Text>
                <Text className="text-3xl font-extrabold text-foreground tracking-tight">
                  ₹{(isPaid ? totalDue : remainingDue).toLocaleString('en-IN')}
                </Text>
                <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-border/40">
                  <View className="flex-row items-center">
                    <Icon as={Calendar} size={12} className="text-muted-foreground me-1" />
                    <Text className="text-xs text-muted-foreground">Due: {dueDateStr}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Icon as={Clock} size={12} className="text-muted-foreground me-1" />
                    <Text className="text-xs text-muted-foreground">Billed: {invoiceDateStr}</Text>
                  </View>
                </View>
              </View>

              {/* Payment Settlement Progress Bar */}
              {isPartial || paidAmount > 0 ? (
                <View className="mt-1">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs text-muted-foreground font-medium">
                      Payment Settlement Progress
                    </Text>
                    <Text className="text-xs font-bold text-primary">{paidPercentage}% Paid</Text>
                  </View>
                  <ProgressBar progress={paidPercentage} className="h-2 rounded-full" />
                </View>
              ) : null}

              {/* Action Buttons inside Card */}
              <View className="flex-row gap-2 mt-4 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => handleExportPdf('print')}
                  className="flex-1 flex-row items-center justify-center gap-1.5"
                >
                  <Icon as={Share2} size={14} className="text-foreground" />
                  <Text className="text-xs font-semibold text-foreground">Share Statement</Text>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => handleExportPdf('download')}
                  className="flex-1 flex-row items-center justify-center gap-1.5"
                >
                  <Icon as={Download} size={14} className="text-foreground" />
                  <Text className="text-xs font-semibold text-foreground">Download PDF</Text>
                </Button>
              </View>
            </View>

            {/* Verification Pending Info Banner */}
            {isPendingVerification ? (
              <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex-row items-start">
                <Icon as={Clock} size={20} className="text-amber-500 me-3 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    Payment Verification Pending
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    Your offline payment reference has been submitted. The admin team is currently verifying the receipt.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Itemized Financial Charge Breakdown Section */}
            <DetailSection title="Itemized Financial Breakdown">
              <DetailRow
                label="Base Maintenance Charge"
                value={`₹${currentCharge.toLocaleString('en-IN')}`}
              />
              {previousOutstanding > 0 ? (
                <DetailRow
                  label="Previous Arrears Carried Forward"
                  value={`₹${previousOutstanding.toLocaleString('en-IN')}`}
                />
              ) : null}
              {lateFee > 0 ? (
                <DetailRow
                  label="Late Fee / Arrears Penalty"
                  value={`₹${lateFee.toLocaleString('en-IN')}`}
                />
              ) : null}
              {taxAmount > 0 ? (
                <DetailRow
                  label="Applicable GST / Taxes"
                  value={`₹${taxAmount.toLocaleString('en-IN')}`}
                />
              ) : null}
              <DetailRow
                label="Gross Total Billed"
                value={`₹${totalDue.toLocaleString('en-IN')}`}
              />
              {paidAmount > 0 ? (
                <DetailRow
                  label="Less Total Settled Amount"
                  value={`- ₹${paidAmount.toLocaleString('en-IN')}`}
                />
              ) : null}
              <DetailRow
                label="Net Balance Payable"
                value={`₹${remainingDue.toLocaleString('en-IN')}`}
              />
            </DetailSection>

            {/* Invoice Metadata Section */}
            <DetailSection title="Statement & Account Information">
              <DetailRow label="Invoice Number" value={invNo} copyable />
              <DetailRow label="Resident Account" value={residentStr} />
              <DetailRow label="Unit / Villa" value={unitStr} />
              <DetailRow label="Billing Cycle" value={periodStr} />
              <DetailRow label="Payment Status" value={statusLabel} />
              {invoice?.paymentMethod ? (
                <DetailRow label="Payment Method" value={invoice.paymentMethod} />
              ) : null}
              {invoice?.offlineReference ? (
                <DetailRow
                  label="Offline Cheque / Ref #"
                  value={invoice.offlineReference}
                  copyable
                />
              ) : null}
            </DetailSection>
          </ScrollView>
        )}

        {/* Sticky Bottom Payment Action Bar */}
        {!isPaid && !isCancelled && !isPendingVerification && remainingDue > 0 ? (
          <View className="absolute bottom-0 left-0 right-0 bg-card/95 border-t border-border p-4 shadow-lg">
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

        {/* Payment Checkout Modal Sheet */}
        <PaymentCheckoutSheet
          visible={showCheckout}
          onClose={() => setShowCheckout(false)}
          invoice={invoice}
          onPaymentSuccess={() => {
            loadResidentDues();
            if (invoiceId) {
              billingService.getInvoiceById(invoiceId).then(setFallbackInvoice).catch(() => {});
            }
          }}
        />
      </View>
    </ScreenShell>
  );
}

export default InvoiceDetailsScreen;
