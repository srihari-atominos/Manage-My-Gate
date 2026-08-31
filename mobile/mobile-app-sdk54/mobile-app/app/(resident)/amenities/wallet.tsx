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
import { WalletHeroCard } from '../../../src/features/billing/components/WalletHeroCard';
import { FinancialTransactionCard } from '../../../src/features/billing/components/FinancialTransactionCard';

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
      <WalletHeroCard
        balance={balance}
        onTopUpPress={handleOpenTopUp}
        topUpLabel="Add Funds to Wallet"
      />

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
            <FinancialTransactionCard
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

