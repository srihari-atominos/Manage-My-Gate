import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/src/store/store';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Receipt, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { fetchWalletBalance, createWalletRazorpayOrder, verifyWalletPayment, clearWalletError } from '../store/walletSlice';
import { useBillingSocket } from '../hooks/useBillingSocket';
import { RazorpayCheckoutModal } from '../components/RazorpayCheckoutModal';
import { WalletTransactionCard } from '../components/WalletTransactionCard';

export function WalletScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const walletState = useSelector((state: RootState) => state.wallet);
  const balance = walletState?.balance || 0;
  const history: any[] = walletState?.transactionHistory || [];
  const isLoading = walletState?.isLoading || false;
  const error = walletState?.error || null;

  // Real-time socket listener
  useBillingSocket();

  // Top-Up State
  const [showTopUpSheet, setShowTopUpSheet] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | 'CUSTOM'>(1000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);

  const loadWallet = useCallback(() => {
    dispatch(fetchWalletBalance());
  }, [dispatch]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleRefresh = useCallback(() => {
    loadWallet();
  }, [loadWallet]);

  // Derived top-up amount
  const topUpAmount = useMemo(() => {
    if (selectedPreset === 'CUSTOM') {
      const parsed = parseFloat(customAmountStr);
      return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
    }
    return selectedPreset;
  }, [selectedPreset, customAmountStr]);

  const expectedBalance = balance + topUpAmount;
  const isTopUpInvalid = topUpAmount <= 0 || topUpAmount > 50000;

  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);

  // Handle Top-Up Execution via Razorpay Order Creation
  const handleProceedTopUp = async () => {
    if (isTopUpInvalid || isProcessingTopUp) return;
    setIsProcessingTopUp(true);

    try {
      // 1. Create Razorpay Top-Up Order on Backend
      const orderData: any = await dispatch(createWalletRazorpayOrder({ amount: topUpAmount })).unwrap();

      const keyId = orderData?.razorpayKeyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';
      const orderId = orderData?.orderId || orderData?.id || '';
      const paymentId = orderData?.paymentId || '';

      setIsProcessingTopUp(false);
      setRazorpayOptions({
        razorpayKeyId: keyId,
        orderId,
        paymentId,
        amount: topUpAmount,
        currency: orderData?.currency || 'INR',
        description: `Digital Wallet Top-Up (₹${topUpAmount})`,
      });
    } catch (err: any) {
      setIsProcessingTopUp(false);
      Alert.alert('Top-Up Order Failed', err?.message || err || 'Unable to create wallet recharge order.');
    }
  };

  const handleWalletRazorpaySuccess = async (payload: any) => {
    setRazorpayOptions(null);
    setIsProcessingTopUp(true);
    try {
      await dispatch(verifyWalletPayment(payload)).unwrap();
      setIsProcessingTopUp(false);
      setShowTopUpSheet(false);
      dispatch(fetchWalletBalance());
      Alert.alert('Top-Up Successful!', `₹${topUpAmount.toLocaleString('en-IN')} has been added to your Digital Wallet balance.`);
    } catch (err: any) {
      setIsProcessingTopUp(false);
      Alert.alert('Verification Failed', err?.message || err || 'Wallet top-up signature verification failed.');
    }
  };

  return (
    <ScreenShell
      title="Digital Wallet"
      subtitle="Instant maintenance top-up & statement history"
      iconName="Wallet"
      loading={isLoading && history.length === 0}
    >
      <View className="flex-1 bg-background">
        {/* Error Banner Container */}
        {error ? (
          <View className="mb-2">
            <ErrorBanner
              message={error}
              onDismiss={() => dispatch(clearWalletError())}
            />
          </View>
        ) : null}

        <View className="flex-1 px-4 pt-2">
          <PaginatedList<any>
            data={history}
            renderItem={(tx: any) => (
              <WalletTransactionCard
                key={tx._id || tx.id || tx.transactionId}
                transaction={tx}
                className="mb-2.5"
              />
            )}
            pagination={{
              currentPage: 1,
              totalPages: 1,
              totalRecords: history.length,
              limit: 50,
            }}
            onLoadMore={() => {}}
            onRefresh={handleRefresh}
            loading={isLoading}
            ListHeaderComponent={
              <View className="mb-3">
                {/* Authoritative Wallet Balance Hero Card */}
                <View className="bg-card border border-border rounded-2xl p-5 shadow-sm mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Available Wallet Balance
                    </Text>
                    <View className="flex-row items-center bg-status-success/15 px-2.5 py-1 rounded-full">
                      <Icon as={ShieldCheck} size={12} className="text-status-success me-1" />
                      <Text className="text-xs font-semibold text-status-success">Verified Ledger</Text>
                    </View>
                  </View>

                  <Text className="text-3xl font-extrabold text-foreground tracking-tight mb-4">
                    ₹{balance.toLocaleString('en-IN')}
                  </Text>

                  {/* Instant Top-Up CTA */}
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full flex-row items-center justify-center bg-status-success active:bg-status-success/90"
                    onPress={() => setShowTopUpSheet(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Add Money to Digital Wallet"
                  >
                    <Icon as={Plus} size={18} className="text-primary-foreground me-2" />
                    <Text className="font-bold text-base text-primary-foreground">Add Money to Wallet</Text>
                  </Button>
                </View>

                {/* Transaction Statement Section Header */}
                <View className="flex-row items-center justify-between px-0.5">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Transaction Statement ({history.length})
                  </Text>
                </View>
              </View>
            }
            emptyIcon="Receipt"
            emptyTitle="No Wallet Transactions Yet"
            emptySubtitle="All your maintenance top-ups, wallet settlements, and refund credits will appear here."
            contentContainerClassName="px-4 pt-3 pb-28"
          />
        </View>

        {/* Instant Top-Up Bottom Sheet */}
        <BottomSheet
          visible={showTopUpSheet}
          onClose={() => setShowTopUpSheet(false)}
          title="Add Money to Digital Wallet"
        >
          <View className="py-2 gap-4">
            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Select Top-Up Amount
            </Text>

            {/* Quick Denomination Presets */}
            <View className="flex-row gap-2.5">
              {[500, 1000, 2000].map((preset) => {
                const isSelected = selectedPreset === preset;
                return (
                  <Button
                    key={preset}
                    variant={isSelected ? 'default' : 'outline'}
                    onPress={() => setSelectedPreset(preset)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    <Text className={`font-extrabold text-sm ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                      + ₹{preset.toLocaleString('en-IN')}
                    </Text>
                  </Button>
                );
              })}
            </View>

            {/* Custom Top-Up Preset Option */}
            <View className="gap-2">
              <Button
                variant={selectedPreset === 'CUSTOM' ? 'default' : 'outline'}
                onPress={() => setSelectedPreset('CUSTOM')}
                className="w-full h-11 rounded-xl"
              >
                <Text className={`font-bold text-xs ${selectedPreset === 'CUSTOM' ? 'text-primary-foreground' : 'text-foreground'}`}>
                  Enter Custom Top-Up Amount
                </Text>
              </Button>

              {selectedPreset === 'CUSTOM' ? (
                <TextInput
                  label="Custom Amount (₹)"
                  value={customAmountStr}
                  onChangeText={setCustomAmountStr}
                  placeholder="Enter amount (e.g. 1500)"
                  keyboardType="numeric"
                  inputClassName="font-bold text-base"
                />
              ) : null}
            </View>

            {/* Expected Balance Preview */}
            <View className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-foreground">Top-Up Amount</Text>
                <Text className="text-base font-extrabold text-status-success">
                  + ₹{topUpAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-muted-foreground">Balance After Top-Up</Text>
                <Text className="text-base font-bold text-foreground">
                  ₹{expectedBalance.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Submit Top-Up Button */}
            <Button
              variant="default"
              size="lg"
              className="w-full flex-row items-center justify-center bg-status-success active:bg-status-success/90 mt-2"
              disabled={isTopUpInvalid || isProcessingTopUp}
              loading={isProcessingTopUp}
              onPress={handleProceedTopUp}
              accessibilityRole="button"
              accessibilityLabel={`Proceed to Top-Up ₹${topUpAmount.toLocaleString('en-IN')} via Razorpay`}
            >
              <Text className="font-bold text-base text-primary-foreground me-1">
                Proceed to Top-Up • ₹{topUpAmount.toLocaleString('en-IN')}
              </Text>
              <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
            </Button>
          </View>
        </BottomSheet>

        {/* Razorpay WebView Checkout Modal for Top-Up */}
        <RazorpayCheckoutModal
          visible={!!razorpayOptions}
          options={razorpayOptions}
          onSuccess={handleWalletRazorpaySuccess}
          onDismiss={(reason) => {
            setRazorpayOptions(null);
            Alert.alert('Top-Up Cancelled', reason || 'Wallet top-up was cancelled by user.');
          }}
          onError={(err) => {
            setRazorpayOptions(null);
            Alert.alert('Top-Up Error', err.description || 'Razorpay checkout encountered an error.');
          }}
        />
      </View>
    </ScreenShell>
  );
}

export default WalletScreen;

