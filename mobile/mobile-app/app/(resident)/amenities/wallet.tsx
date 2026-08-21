import React from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Plus, ShieldCheck } from 'lucide-react-native';
import { useResidentWallet } from '../../../src/features/amenities/hooks/useResidentWallet';
import { WalletTopUpModal } from '../../../src/features/amenities/components/WalletTopUpModal';
import { WalletTransaction } from '../../../src/features/amenities/store/walletSlice';
import { WalletTransactionCard } from '../../../src/features/billing/components/WalletTransactionCard';

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
    <View className="mb-3">
      {/* Harmonized Wallet Balance Hero Card */}
      <View className="bg-card border border-border rounded-2xl p-5 shadow-sm mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Available Wallet Balance
          </Text>
          <View className="flex-row items-center bg-status-success/15 px-2.5 py-1 rounded-full">
            <Icon as={ShieldCheck} size={12} className="text-status-success me-1" />
            <Text className="text-xs font-semibold text-status-success">Instant Bookings Ready</Text>
          </View>
        </View>

        <Text className="text-3xl font-extrabold text-foreground tracking-tight mb-4">
          ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>

        {/* Instant Top-Up CTA */}
        <Button
          variant="default"
          size="lg"
          className="w-full flex-row items-center justify-center bg-status-success active:bg-status-success/90"
          onPress={handleOpenTopUp}
          accessibilityRole="button"
          accessibilityLabel="Add Funds to Amenity Wallet"
        >
          <Icon as={Plus} size={18} className="text-primary-foreground me-2" />
          <Text className="font-bold text-base text-primary-foreground">Add Funds to Wallet</Text>
        </Button>
      </View>

      {/* Transaction History Section Header */}
      <View className="flex-row items-center justify-between px-0.5">
        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Transaction Statement ({transactions.length})
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenShell
      title="Digital Wallet"
      subtitle="View your credit balance & transaction statement"
      iconName="Wallet"
      loading={loading && transactions.length === 0}
      error={error}
      onRetry={handleRefresh}
    >
      <View className="flex-1 px-4 pt-2">
        <PaginatedList<WalletTransaction>
          data={transactions}
          renderItem={(item: WalletTransaction) => (
            <WalletTransactionCard
              key={item._id || (item as any).id || (item as any).transactionId}
              transaction={item}
              className="mb-2.5"
            />
          )}
          pagination={{ currentPage: 1, totalPages: 1, totalRecords: transactions.length, limit: 50 }}
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

