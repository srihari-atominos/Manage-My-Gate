import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { TabBar } from '@/components/ui/TabBar';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Receipt } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';

const FILTER_PILLS = [
  { key: 'ALL', label: 'All History' },
  { key: 'PAID', label: 'Paid' },
  { key: 'PARTIALLY_PAID', label: 'Partial' },
  { key: 'VERIFICATION_PENDING', label: 'Pending Clearance' },
  { key: 'UNPAID', label: 'Unpaid' },
];

export function ResidentPaymentHistoryScreen() {
  const router = useRouter();
  const {
    activeDues,
    loadingStates,
    error,
    loadResidentDues,
    resetBillingError,
  } = useBilling();

  // Socket listener for real-time invoice status updates
  useBillingSocket();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  const handleRefresh = useCallback(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  // Extract recentInvoices array from activeDues
  const recentInvoices: any[] = useMemo(() => {
    return activeDues?.recentInvoices || [];
  }, [activeDues]);

  // Filter invoices by selected status pill
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'ALL') return recentInvoices;
    if (statusFilter === 'PARTIALLY_PAID') {
      return recentInvoices.filter(
        (inv) => inv.status === 'PARTIALLY_PAID' || (inv.paidAmount > 0 && inv.paidAmount < (inv.totalDue || inv.amount))
      );
    }
    return recentInvoices.filter((inv) => inv.status === statusFilter);
  }, [recentInvoices, statusFilter]);

  const handleViewInvoiceDetails = (invoiceId: string) => {
    if (!invoiceId) return;
    router.push(`/(resident)/billing/invoice/${invoiceId}` as any);
  };

  return (
    <ScreenShell
      title="Payment History"
      subtitle="View your past settled maintenance fees & receipts"
      iconName="Receipt"
      loading={loadingStates.fetchDues && recentInvoices.length === 0}
    >
      <View className="flex-1 bg-background">
        {/* Error Banner Container */}
        {error ? (
          <View className="mb-2">
            <ErrorBanner
              message={error}
              onDismiss={() => {
                resetBillingError();
              }}
            />
          </View>
        ) : null}

        {/* Canonical TabBar: Filter Pills */}
        <TabBar
          tabs={FILTER_PILLS}
          activeTab={statusFilter}
          onTabChange={setStatusFilter}
          variant="pill"
          className="mx-4 my-2"
        />

        {/* Invoice Payment History Card List */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={loadingStates.fetchDues}
              onRefresh={handleRefresh}
            />
          }
        >
          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Payment History Found"
              description={
                statusFilter === 'ALL'
                  ? 'You currently have no historical billing payment records.'
                  : `No invoice records match status filter "${statusFilter.replace(/_/g, ' ')}".`
              }
            />
          ) : (
            <View className="gap-3">
              {filteredInvoices.map((inv, idx) => {
                const invoiceId = inv.invoiceId || inv._id || inv.id || `inv-${idx}`;
                const invNo = inv.invoiceNumber || invoiceId || '—';
                const unitStr = inv.unitNumber ? `Villa ${inv.unitNumber}` : 'Villa Unit';
                const periodStr = inv.billingPeriodString || 'Current Period';
                const totalBilled = inv.totalDue ?? inv.amount ?? 0;
                const paidAmount = inv.paidAmount ?? (inv.status === 'PAID' ? totalBilled : 0);
                const remainingBalance = inv.outstandingAmount ?? Math.max(0, totalBilled - paidAmount);

                const status = inv.status || 'UNPAID';
                const statusVariant = getStatusVariant(status);
                const statusLabel = status.replace(/_/g, ' ');
                const isPaid = status === 'PAID';

                return (
                  <TouchableOpacity
                    key={invoiceId}
                    onPress={() => handleViewInvoiceDetails(invoiceId)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`View Invoice ${invNo} Details`}
                    className="bg-card border border-border rounded-xl p-4 shadow-sm"
                  >
                    {/* Top Row: Invoice Number & Status Pill */}
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-row items-center flex-1 me-2">
                        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center me-3">
                          <Icon as={Receipt} size={20} className="text-primary" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-foreground font-bold text-base truncate">
                            {invNo}
                          </Text>
                          <Text className="text-muted-foreground text-xs font-medium">
                            {unitStr} • {periodStr}
                          </Text>
                        </View>
                      </View>

                      <StatusBadge label={statusLabel} variant={statusVariant} dot />
                    </View>

                    {/* Financial Figures Breakdown */}
                    <View className="bg-muted/40 border border-border/50 rounded-xl p-3 mb-3 flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs text-muted-foreground">Total Billed</Text>
                        <Text className="text-sm font-bold text-foreground">
                          ₹{totalBilled.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View className="items-center">
                        <Text className="text-xs text-muted-foreground">Amount Paid</Text>
                        <Text className="text-sm font-bold text-status-success">
                          ₹{paidAmount.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-xs text-muted-foreground">Remaining</Text>
                        <Text className="text-sm font-bold text-foreground">
                          ₹{remainingBalance.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Action Bar: Payment Method & Details / Receipt Trigger */}
                    <View className="flex-row items-center justify-between pt-1">
                      <View className="flex-row items-center">
                        {inv.paymentMethod ? (
                          <Text className="text-xs text-muted-foreground font-medium">
                            Method: <Text className="font-bold text-foreground">{inv.paymentMethod}</Text>
                          </Text>
                        ) : (
                          <Text className="text-xs text-muted-foreground font-medium">
                            {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : 'Recent Record'}
                          </Text>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Button
                          variant={isPaid ? 'default' : 'secondary'}
                          size="sm"
                          onPress={() => handleViewInvoiceDetails(invoiceId)}
                          accessibilityRole="button"
                          accessibilityLabel={isPaid ? 'View Invoice Receipt' : 'View Details'}
                        >
                          {isPaid ? 'Receipt' : 'Details'}
                        </Button>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenShell>
  );
}

export default ResidentPaymentHistoryScreen;

