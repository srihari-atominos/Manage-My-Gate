import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/src/store/store';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/common/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Receipt, CreditCard, Clock, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { fetchWalletBalance, createWalletRazorpayOrder, verifyWalletPayment, clearWalletError } from '../store/walletSlice';
import { useBillingSocket } from '../hooks/useBillingSocket';
import { RazorpayCheckoutModal } from '../components/RazorpayCheckoutModal';

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
          <View className="p-4">
            <ErrorBanner
              message={error}
              onDismiss={() => dispatch(clearWalletError())}
            />
          </View>
        ) : null}

        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
            />
          }
        >
          {/* Authoritative Wallet Balance Hero Card */}
          <View className="bg-card border border-border rounded-2xl p-5 shadow-sm mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Available Wallet Balance
              </Text>
              <View className="flex-row items-center bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <Icon as={ShieldCheck} size={12} className="text-emerald-600 dark:text-emerald-400 me-1" />
                <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Verified Ledger</Text>
              </View>
            </View>

            <Text className="text-3xl font-extrabold text-foreground tracking-tight mb-4">
              ₹{balance.toLocaleString('en-IN')}
            </Text>

            {/* Instant Top-Up CTA */}
            <Button
              variant="default"
              size="lg"
              className="w-full flex-row items-center justify-center bg-emerald-600 active:bg-emerald-700"
              onPress={() => setShowTopUpSheet(true)}
              accessibilityRole="button"
              accessibilityLabel="Add Money to Digital Wallet"
            >
              <Icon as={Plus} size={18} className="text-white me-2" />
              <Text className="font-bold text-base text-white">Add Money to Wallet</Text>
            </Button>
          </View>

          {/* Wallet Statement / Transaction History Section */}
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Transaction Statement ({history.length})
              </Text>
            </View>

            {history.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No Wallet Transactions Yet"
                description="All your maintenance top-ups, wallet settlements, and refund credits will appear here."
              />
            ) : (
              <View className="gap-3">
                {history.map((tx: any, index: number) => {
                  const txId = tx._id || tx.id || `tx-${index}`;
                  const isCredit = tx.type === 'Credit' || tx.type === 'TOP_UP' || tx.type === 'REFUND';
                  const titleStr = tx.description || (isCredit ? 'Wallet Top-Up' : 'Maintenance Settlement');
                  const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN') : 'Recent';
                  const amountNum = tx.amount || 0;
                  const formattedTxAmount = `${isCredit ? '+' : '-'} ₹${amountNum.toLocaleString('en-IN')}`;
                  const txStatus = tx.status || 'COMPLETED';
                  const statusVariant = getStatusVariant(txStatus);

                  return (
                    <View
                      key={txId}
                      className="bg-card border border-border rounded-xl p-4 shadow-sm flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 me-3">
                        <View className={`w-10 h-10 rounded-xl items-center justify-center me-3 ${
                          isCredit ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                        }`}>
                          <Icon
                            as={isCredit ? ArrowDownLeft : ArrowUpRight}
                            size={20}
                            className={isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-foreground font-bold text-sm truncate">
                            {titleStr}
                          </Text>
                          <Text className="text-muted-foreground text-xs">
                            {dateStr} • {tx.paymentMethod || 'Wallet'}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-base font-extrabold mb-1 ${
                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                          }`}
                          accessibilityLabel={`${isCredit ? 'Credit' : 'Debit'} of ₹${amountNum.toLocaleString('en-IN')}`}
                        >
                          {formattedTxAmount}
                        </Text>
                        <StatusBadge label={txStatus.replace(/_/g, ' ')} variant={statusVariant} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

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
                  <Pressable
                    key={preset}
                    onPress={() => setSelectedPreset(preset)}
                    className={`flex-1 py-3 rounded-xl border items-center justify-center ${
                      isSelected ? 'bg-primary/10 border-primary' : 'bg-card border-border'
                    }`}
                  >
                    <Text className={`font-extrabold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      + ₹{preset.toLocaleString('en-IN')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Top-Up Preset Option */}
            <Pressable
              onPress={() => setSelectedPreset('CUSTOM')}
              className={`p-3.5 rounded-xl border ${
                selectedPreset === 'CUSTOM' ? 'bg-primary/5 border-primary' : 'bg-card border-border'
              }`}
            >
              <Text className="font-bold text-xs text-foreground mb-1.5">Enter Custom Top-Up Amount</Text>
              {selectedPreset === 'CUSTOM' ? (
                <View className="flex-row items-center bg-background border border-border rounded-xl px-3 py-1.5">
                  <Text className="text-foreground font-bold text-base me-2">₹</Text>
                  <TextInput
                    value={customAmountStr}
                    onChangeText={setCustomAmountStr}
                    placeholder="Enter amount (e.g. 1500)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    className="flex-1 text-foreground font-bold text-base py-1"
                  />
                </View>
              ) : null}
            </Pressable>

            {/* Expected Balance Preview */}
            <View className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-foreground">Top-Up Amount</Text>
                <Text className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
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
              className="w-full flex-row items-center justify-center bg-emerald-600 active:bg-emerald-700 mt-2"
              disabled={isTopUpInvalid || isProcessingTopUp}
              loading={isProcessingTopUp}
              onPress={handleProceedTopUp}
              accessibilityRole="button"
              accessibilityLabel={`Proceed to Top-Up ₹${topUpAmount.toLocaleString('en-IN')} via Razorpay`}
            >
              <Text className="font-bold text-base text-white me-1">
                Proceed to Top-Up • ₹{topUpAmount.toLocaleString('en-IN')}
              </Text>
              <Icon as={ChevronRight} size={18} className="text-white" />
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
