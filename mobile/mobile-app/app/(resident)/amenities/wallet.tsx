import React from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { useResidentWallet } from '../../../src/features/amenities/hooks/useResidentWallet';
import { WalletTopUpModal } from '../../../src/features/amenities/components/WalletTopUpModal';
import { WalletTransaction } from '../../../src/features/amenities/store/walletSlice';

export default function ResidentWalletScreen() {
  const {
    balance,
    transactions,
    isTopUpModalOpen,
    loading,
    toppingUp,
    error,
    handleOpenTopUp,
    handleCloseTopUp,
    handleTopUpSubmit,
    handleRefresh,
  } = useResidentWallet();

  const renderHeader = () => (
    <View className="mb-4">
      {/* Wallet Balance KPI Card */}
      <View className="bg-card p-4 rounded-2xl border border-border mb-5 flex-row items-center justify-between shadow-xs">
        <View className="flex-1 me-3">
          <Text variant="muted" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Available Wallet Balance
          </Text>
          <Text className="text-3xl font-extrabold text-foreground mt-1">
            ₹{balance.toFixed(2)}
          </Text>
          <View className="flex-row items-center mt-1">
            <View className="w-2 h-2 rounded-full bg-emerald-500 me-1.5" />
            <Text variant="muted" className="text-xs text-muted-foreground">
              Ready for Instant Amenity Bookings
            </Text>
          </View>
        </View>

        <Button variant="default" onPress={handleOpenTopUp} className="bg-primary px-4 py-3 rounded-xl shadow-xs">
          <Text className="text-white font-bold text-sm">+ Add Funds</Text>
        </Button>
      </View>

      {/* Transaction History Section Header */}
      <View className="flex-row items-center justify-between mb-3 px-0.5">
        <Text variant="large" className="font-bold text-foreground">
          Transaction Ledger
        </Text>
        <Text variant="muted" className="text-xs font-medium text-muted-foreground">
          {transactions.length} {transactions.length === 1 ? 'Record' : 'Records'}
        </Text>
      </View>
    </View>
  );

  const renderTransactionItem = (item: WalletTransaction) => {
    const isCredit = item.type === 'CREDIT';
    const paymentStatusStr = (item.paymentStatus || 'success').toLowerCase();
    const statusVariant: StatusVariant =
      paymentStatusStr === 'success' || paymentStatusStr === 'completed'
        ? 'success'
        : paymentStatusStr === 'refunded'
        ? 'info'
        : paymentStatusStr === 'failed'
        ? 'danger'
        : 'warning';

    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View className="mb-2.5 bg-card p-3.5 rounded-2xl border border-border flex-row items-center justify-between shadow-xs">
        <View className="flex-row items-center flex-1 me-3">
          <View
            className={`w-10 h-10 rounded-xl items-center justify-center me-3 ${
              isCredit ? 'bg-emerald-500/15' : 'bg-amber-500/15'
            }`}
          >
            <Text className={`font-bold text-base ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isCredit ? '↓' : '↑'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-sm text-foreground" numberOfLines={1}>
              {item.description || (isCredit ? 'Wallet Top-Up' : 'Amenity Booking Fee')}
            </Text>
            <Text variant="muted" className="text-xs text-muted-foreground mt-0.5">
              {formattedDate} • {item.paymentMethod || 'WALLET'}
            </Text>
          </View>
        </View>

        <View className="items-end ms-2">
          <Text
            className={`font-bold text-sm mb-1 ${
              isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
            }`}
          >
            {isCredit ? `+₹${item.amount.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}
          </Text>
          <StatusBadge
            label={(item.paymentStatus || 'SUCCESS').toUpperCase()}
            variant={statusVariant}
          />
        </View>
      </View>
    );
  };

  return (
    <ScreenShell
      title="Digital Wallet"
      subtitle="View your credit balance & transaction ledger"
      iconName="Wallet"
      loading={loading && transactions.length === 0}
      error={error}
      onRetry={handleRefresh}
    >
      <View className="flex-1 px-4 pt-2">
        <PaginatedList
          data={transactions}
          renderItem={renderTransactionItem}
          pagination={{ currentPage: 1, totalPages: 1, totalRecords: transactions.length, limit: 20 }}
          onLoadMore={() => {}}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Receipt"
          emptyTitle="No Transaction Records"
          emptySubtitle="Your wallet top-ups and amenity booking transactions will appear here."
          contentContainerClassName="pb-6"
        />
      </View>

      {/* Wallet Top-Up Modal */}
      <WalletTopUpModal
        visible={isTopUpModalOpen}
        onClose={handleCloseTopUp}
        onSubmit={handleTopUpSubmit}
        loading={toppingUp}
      />
    </ScreenShell>
  );
}
