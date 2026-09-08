import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { AlertCircle } from 'lucide-react-native';
import { useWallet } from '../hooks/useWallet';
import { WalletHeroCard } from '../components/WalletHeroCard';
import { WalletTransactionCard } from '../components/WalletTransactionCard';
import { WalletTopUpBottomSheet } from '../components/WalletTopUpBottomSheet';
import { RazorpayCheckoutModal } from '../components/RazorpayCheckoutModal';

export function WalletScreen() {
  const router = useRouter();
  const {
    balance,
    activePasses,
    transactionHistory,
    isLoading,
    error,
    isGatewayReady,
    loadWallet,
    initiateTopUpOrder,
    confirmTopUpPayment,
    dismissError,
  } = useWallet();

  // Top-Up State
  const [showTopUpSheet, setShowTopUpSheet] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | 'CUSTOM'>(1000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);

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

  // Handle Top-Up Execution via Razorpay Order Creation
  const handleProceedTopUp = async () => {
    if (isTopUpInvalid || isProcessingTopUp) return;
    setIsProcessingTopUp(true);

    try {
      const orderData: any = await initiateTopUpOrder(topUpAmount);

      const keyId =
        orderData?.razorpayKeyId ||
        orderData?.keyId ||
        orderData?.key ||
        process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
        '';
      const orderId = orderData?.orderId || orderData?.id || '';
      const paymentId = orderData?.paymentId || '';

      setIsProcessingTopUp(false);
      setShowTopUpSheet(false);
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
      Alert.alert(
        'Top-Up Order Failed',
        err?.message || err || 'Unable to create wallet recharge order.'
      );
    }
  };

  const handleWalletRazorpaySuccess = async (payload: any) => {
    const currentPaymentId = payload?.paymentId || razorpayOptions?.paymentId;
    setRazorpayOptions(null);
    setIsProcessingTopUp(true);
    try {
      await confirmTopUpPayment({
        ...payload,
        paymentId: currentPaymentId,
        amount: topUpAmount,
      });
      setIsProcessingTopUp(false);
      Alert.alert(
        'Top-Up Successful',
        `₹${topUpAmount.toLocaleString('en-IN')} has been added to your digital wallet balance.`
      );
    } catch (err: any) {
      setIsProcessingTopUp(false);
      Alert.alert(
        'Verification Failed',
        err?.message || err || 'Payment verification failed. Please contact support.'
      );
    }
  };

  return (
    <ScreenShell title="Digital Wallet">
      <View className="flex-1 bg-background">
        {/* Error Notification Banner */}
        {error ? (
          <View className="px-4 pt-2">
            <ErrorBanner message={error} onDismiss={dismissError} />
          </View>
        ) : null}

        {/* Transactions & Statement List */}
        <View className="flex-1 px-4 pt-2">
          <PaginatedList<any>
            data={transactionHistory}
            renderItem={(item: any) => (
              <WalletTransactionCard
                key={item._id || item.id || item.transactionId}
                transaction={item}
                className="mb-2.5"
              />
            )}
            pagination={{
              currentPage: 1,
              totalPages: 1,
              totalRecords: transactionHistory.length,
              limit: 50,
            }}
            onLoadMore={() => {}}
            onRefresh={handleRefresh}
            loading={isLoading}
            ListHeaderComponent={
              <View className="mb-3">
                {/* Gateway unconfigured notice */}
                {!isGatewayReady && !isLoading ? (
                  <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 flex-row items-center">
                    <Icon
                      as={AlertCircle}
                      size={16}
                      className="text-amber-600 dark:text-amber-400 me-2.5 shrink-0"
                    />
                    <Text className="text-xs text-amber-900 dark:text-amber-200 font-medium flex-1">
                      Online Top-Up Disabled: Community administrator has not configured Razorpay
                      in the Integration Hub.
                    </Text>
                  </View>
                ) : null}

                {/* Authoritative Wallet Balance Hero Card */}
                <WalletHeroCard
                  balance={balance}
                  onTopUpPress={() => setShowTopUpSheet(true)}
                  loading={isProcessingTopUp}
                  className="mt-1"
                />

                {/* Transaction Statement Section Header */}
                <View className="flex-row items-center justify-between px-0.5">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Transaction Statement ({transactionHistory.length})
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
        <WalletTopUpBottomSheet
          visible={showTopUpSheet}
          onClose={() => setShowTopUpSheet(false)}
          isGatewayReady={isGatewayReady}
          selectedPreset={selectedPreset}
          onSelectPreset={setSelectedPreset}
          customAmountStr={customAmountStr}
          onChangeCustomAmount={setCustomAmountStr}
          topUpAmount={topUpAmount}
          expectedBalance={expectedBalance}
          isTopUpInvalid={isTopUpInvalid}
          isProcessingTopUp={isProcessingTopUp}
          onProceedTopUp={handleProceedTopUp}
        />

        {/* Razorpay In-App WebView Payment Modal */}
        <RazorpayCheckoutModal
          visible={Boolean(razorpayOptions)}
          options={razorpayOptions}
          onSuccess={handleWalletRazorpaySuccess}
          onDismiss={() => {
            setRazorpayOptions(null);
            setIsProcessingTopUp(false);
          }}
          onError={(errPayload) => {
            setRazorpayOptions(null);
            setIsProcessingTopUp(false);
            Alert.alert(
              'Top-Up Error',
              errPayload.description || 'Payment was cancelled or could not be processed.'
            );
          }}
        />
      </View>
    </ScreenShell>
  );
}

export default WalletScreen;
