import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/common/Button';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Receipt, FileText, ChevronRight, CheckCircle2, Clock } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';

const FILTER_PILLS = [
  { id: 'ALL', label: 'All History' },
  { id: 'PAID', label: 'Paid' },
  { id: 'PARTIALLY_PAID', label: 'Partial' },
  { id: 'VERIFICATION_PENDING', label: 'Pending Clearance' },
  { id: 'UNPAID', label: 'Unpaid' },
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
          <View className="p-4">
            <ErrorBanner
              message={error}
              onDismiss={() => {
                resetBillingError();
              }}
            />
          </View>
        ) : null}

        {/* Filter Pills Header */}
        <View className="px-4 py-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTER_PILLS.map((pill) => {
              const isActive = statusFilter === pill.id;
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => setStatusFilter(pill.id)}
                  className={`px-3.5 py-1.5 rounded-full border ${
                    isActive ? 'bg-primary border-primary' : 'bg-muted border-border'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${pill.label}`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {pill.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Invoice Payment History Card List */}
        <ScrollView
          className="flex-1 px-4 pt-2"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={loadingStates.fetchDues}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
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
                  <Pressable
                    key={invoiceId}
                    onPress={() => handleViewInvoiceDetails(invoiceId)}
                    accessibilityRole="button"
                    accessibilityLabel={`View Invoice ${invNo} Details`}
                    className="bg-card border border-border rounded-xl p-4 shadow-sm active:bg-muted/40"
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
                        <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
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
                  </Pressable>
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
