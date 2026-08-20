import React, { useEffect, useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Wallet, CreditCard, Receipt, ChevronRight, CheckCircle2, ShieldAlert, Clock, Zap } from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';
import { UnitDueBreakdown, InvoiceStatus, Invoice } from '../types';
import { PaymentCheckoutSheet } from '../components/PaymentCheckoutSheet';
import { OfflineSettleSheet } from '../components/OfflineSettleSheet';

export function ResidentMyDuesScreen() {
  const router = useRouter();
  const {
    activeDues,
    walletBalance,
    loadingStates,
    error,
    loadResidentDues,
    resetBillingError,
  } = useBilling();

  // Listen silently for background Socket.io billing & wallet events
  useBillingSocket();

  // Modal sheet state
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [offlineInvoice, setOfflineInvoice] = useState<Invoice | null>(null);

  // Load resident dues & wallet balance on screen mount
  useEffect(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  const handleRefresh = useCallback(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  const totalPortfolioDue = activeDues?.totalPortfolioDue || 0;
  const duesList: UnitDueBreakdown[] = activeDues?.unitBreakdown || [];

  // Check for any invoice pending admin verification
  const clearingInvoice = duesList.find((inv) => inv.status === ('VERIFICATION_PENDING' as InvoiceStatus));
  const isClearing = !!clearingInvoice;
  const clearingAmount = (clearingInvoice as any)?.offlineAmount || clearingInvoice?.totalDue || 0;
  const clearingRef = (clearingInvoice as any)?.offlineReference || 'Cheque';

  const handleViewInvoiceDetails = (invoiceId: string) => {
    if (!invoiceId) return;
    router.push(`/(resident)/billing/invoice/${invoiceId}` as any);
  };

  const handleOpenWalletScreen = () => {
    router.push('/(resident)/billing/wallet' as any);
  };

  const handleOpenPaymentHistory = () => {
    router.push('/(resident)/billing/history' as any);
  };

  const findFirstUnpaidInvoice = (): Invoice | null => {
    const firstDue = duesList.find(
      (inv) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) || inv.totalDue > 0
    );
    if (!firstDue) return null;
    const invId = firstDue.invoiceId || (firstDue as any)._id;
    return {
      _id: invId,
      invoiceNumber: firstDue.invoiceNumber || invId,
      unitNumber: firstDue.unitNumber,
      billingPeriodString: firstDue.billingPeriodString,
      totalDue: firstDue.totalDue,
      status: firstDue.status,
    } as Invoice;
  };

  const handlePayNowPrimary = () => {
    const targetInv = findFirstUnpaidInvoice();
    if (targetInv) {
      setCheckoutInvoice(targetInv);
    }
  };

  const handleOfflineChequePrimary = () => {
    const targetInv = findFirstUnpaidInvoice();
    if (targetInv) {
      setOfflineInvoice(targetInv);
    }
  };

  return (
    <ScreenShell
      title="Personal Dues"
      subtitle="Manage & settle your unit maintenance liabilities"
      iconName="CreditCard"
      loading={loadingStates.fetchDues && duesList.length === 0}
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
          {/* Portfolio Liability Hero Banner */}
          <View className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Outstanding Dues
              </Text>
              <View className="flex-row items-center bg-primary/10 px-2.5 py-1 rounded-full">
                <Icon as={CreditCard} size={12} className="text-primary me-1" />
                <Text className="text-xs font-semibold text-primary">Active Portfolio</Text>
              </View>
            </View>

            <Text className="text-3xl font-extrabold text-foreground tracking-tight mb-4">
              ₹{totalPortfolioDue.toLocaleString('en-IN')}
            </Text>

            {/* Digital Wallet Pill Widget */}
            <View className="flex-row items-center justify-between bg-muted/50 border border-border/60 rounded-xl p-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-status-success/15 items-center justify-center me-2.5">
                  <Icon as={Wallet} size={18} className="text-status-success" />
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground font-medium">Digital Wallet</Text>
                  <Text className="text-sm font-bold text-foreground">
                    ₹{walletBalance.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <Button
                variant="outline"
                size="sm"
                onPress={handleOpenWalletScreen}
                accessibilityLabel="Manage Digital Wallet"
                accessibilityRole="button"
              >
                View Wallet
              </Button>
            </View>

            {/* Payment & Invoice History Button */}
            <TouchableOpacity
              onPress={handleOpenPaymentHistory}
              activeOpacity={0.8}
              className="mt-3 flex-row items-center justify-between bg-muted/40 border border-border/50 rounded-xl p-3"
              accessibilityRole="button"
              accessibilityLabel="View Payment and Invoice History"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center me-2.5">
                  <Icon as={Receipt} size={18} className="text-primary" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-foreground">Payment & Invoice History</Text>
                  <Text className="text-xs text-muted-foreground">View past receipts & settled fees</Text>
                </View>
              </View>
              <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Pending Verification Clearing Banner */}
          {isClearing ? (
            <View className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex-row items-center">
              <Icon as={Clock} size={20} className="text-primary me-3" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-foreground">
                  Payment Clearance In Progress
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Payment of ₹{clearingAmount.toLocaleString('en-IN')} is clearing via Reference {clearingRef}. Awaiting admin verification.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Active Maintenance Dues Section */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Maintenance Invoices ({duesList.length})
              </Text>
            </View>

            {duesList.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All Dues Settled!"
                description="You currently have no outstanding maintenance fees or unpaid invoices."
              />
            ) : (
              <View className="gap-3">
                {duesList.map((item) => {
                  const invoiceId = item.invoiceId || (item as any)._id;
                  const invNo = item.invoiceNumber || invoiceId || '—';
                  const unitStr = item.unitNumber ? `Villa ${item.unitNumber}` : 'Villa Unit';
                  const periodStr = item.billingPeriodString || 'Current Month';
                  const dueAmount = item.totalDue || 0;
                  const formattedDue = `₹${dueAmount.toLocaleString('en-IN')}`;

                  const statusVariant = getStatusVariant(item.status);
                  const statusLabel = item.status ? item.status.replace(/_/g, ' ') : 'UNPAID';
                  const isPendingVerification = item.status === ('VERIFICATION_PENDING' as InvoiceStatus);

                  const mappedInvoice: Invoice = {
                    _id: invoiceId,
                    invoiceNumber: invNo,
                    unitNumber: item.unitNumber,
                    billingPeriodString: periodStr,
                    totalDue: dueAmount,
                    status: item.status,
                  } as Invoice;

                  return (
                    <TouchableOpacity
                      key={invoiceId}
                      onPress={() => handleViewInvoiceDetails(invoiceId)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`View Invoice ${invNo} for ${unitStr}`}
                      className="bg-card border border-border rounded-xl p-4 shadow-sm"
                    >
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

                      <View className="border-t border-border/50 pt-3 flex-row items-center justify-between">
                        <View>
                          <Text className="text-xs text-muted-foreground">Remaining Liability</Text>
                          <Text className="text-lg font-extrabold text-foreground">
                            {formattedDue}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onPress={() => handleViewInvoiceDetails(invoiceId)}
                          >
                            Details
                          </Button>

                          {!isPendingVerification ? (
                            <Button
                              variant="default"
                              size="sm"
                              onPress={() => setCheckoutInvoice(mappedInvoice)}
                            >
                              Pay Now
                            </Button>
                          ) : (
                            <View className="bg-primary/10 px-2.5 py-1 rounded-lg">
                              <Text className="text-primary text-xs font-semibold">
                                Pending
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Tenant Compliance Arrears Section */}
          {activeDues?.secondaryCompliance && activeDues.secondaryCompliance.length > 0 ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Tenant Arrears ({activeDues.secondaryCompliance.length})
                </Text>
              </View>

              <View className="bg-card border border-border rounded-xl p-4 shadow-sm gap-3">
                {activeDues.secondaryCompliance.map((arrear: any, idx: number) => (
                  <View key={arrear._id || idx} className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 me-2">
                      <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center me-3">
                        <Text className="font-bold text-primary text-sm">
                          {(arrear.tenantName || 'T').charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-sm text-foreground">{arrear.tenantName}</Text>
                        <Text className="text-xs text-muted-foreground">{arrear.unit || arrear.unitNumber || 'Leased Unit'}</Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="font-extrabold text-sm text-foreground">
                        ₹{(arrear.amountDue || arrear.amount || 0).toLocaleString('en-IN')}
                      </Text>
                      <StatusBadge label={arrear.status || 'UNPAID'} variant="danger" />
                    </View>
                  </View>
                ))}

                <View className="border-t border-border/50 pt-2.5 flex-row items-center">
                  <Icon as={ShieldAlert} size={14} className="text-amber-600 dark:text-amber-400 me-2" />
                  <Text className="text-xs text-muted-foreground flex-1">
                    As the owner, you may be held liable if tenant dues remain unpaid beyond 30 days.
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky Action Bar for Global Payment Triggers */}
        {totalPortfolioDue > 0 ? (
          <View className="absolute bottom-0 left-0 right-0 bg-background/95 border-t border-border p-4 shadow-lg flex-row gap-2">
            <Button
              variant="default"
              size="lg"
              className="flex-1 flex-row items-center justify-center"
              disabled={isClearing}
              onPress={handlePayNowPrimary}
              accessibilityRole="button"
              accessibilityLabel={`Pay Now ₹${totalPortfolioDue.toLocaleString('en-IN')}`}
            >
              <Icon as={Zap} size={18} className="text-primary-foreground me-1.5" />
              <Text className="font-bold text-sm text-primary-foreground">
                {isClearing ? 'Clearing…' : `Pay Now — ₹${totalPortfolioDue.toLocaleString('en-IN')}`}
              </Text>
            </Button>

            {!isClearing ? (
              <Button
                variant="outline"
                size="lg"
                onPress={handleOfflineChequePrimary}
                accessibilityRole="button"
                accessibilityLabel="Record Offline Cheque Payment"
              >
                Offline Cheque
              </Button>
            ) : null}
          </View>
        ) : null}

        {/* Payment Checkout Sheet */}
        <PaymentCheckoutSheet
          visible={!!checkoutInvoice}
          invoice={checkoutInvoice}
          onClose={() => setCheckoutInvoice(null)}
          onPaymentSuccess={() => {
            loadResidentDues();
          }}
        />

        {/* Offline Settlement Sheet */}
        <OfflineSettleSheet
          visible={!!offlineInvoice}
          invoice={offlineInvoice}
          onClose={() => setOfflineInvoice(null)}
          onSettlementSubmitted={() => {
            loadResidentDues();
          }}
        />
      </View>
    </ScreenShell>
  );
}

export default ResidentMyDuesScreen;


