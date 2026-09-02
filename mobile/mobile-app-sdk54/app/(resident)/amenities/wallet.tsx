import React from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
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

  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((tx: WalletTransaction) => {
      // Type filter
      if (activeFilter === 'CREDIT' && (tx.type || '').toUpperCase() !== 'CREDIT' && !(tx as any).isCredit) {
        return false;
      }
      if (activeFilter === 'DEBIT' && (tx.type || '').toUpperCase() !== 'DEBIT' && (tx as any).isCredit) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const desc = (tx.description || (tx as any).notes || '').toLowerCase();
        const ref = (tx.referenceId || (tx as any).reference || tx._id || '').toLowerCase();
        return desc.includes(q) || ref.includes(q);
      }
      return true;
    });
  }, [transactions, activeFilter, search]);

  const renderHeader = () => (
    <View className="mb-3 gap-3">
      {/* Harmonized Wallet Balance Hero Card */}
      <WalletHeroCard
        balance={balance}
        onTopUpPress={handleOpenTopUp}
        topUpLabel="Add Funds to Wallet"
      />

      {/* Real-Time Keyword Search Bar & Moveable Slide Status Filter */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transactions or reference..."
        sortOptions={[
          { label: 'All Statements', value: 'ALL' },
          { label: 'Top-Ups (+)', value: 'CREDIT' },
          { label: 'Bookings (-)', value: 'DEBIT' },
        ]}
        currentSort={activeFilter}
        onSortChange={(val) => setActiveFilter(val as any)}
        variant="default"
        className="px-0 py-0 border-0"
      />

      {/* Transaction History Section Header */}
      <View className="flex-row items-center justify-between px-0.5">
        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Transaction Statement ({filteredTransactions.length})
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
      <View className="flex-1 bg-background">
        <PaginatedList<WalletTransaction>
          data={filteredTransactions}
          renderItem={(item: WalletTransaction) => (
            <FinancialTransactionCard
              key={item._id || (item as any).id || (item as any).transactionId}
              transaction={item}
              className="mb-2.5"
            />
          )}
          pagination={{ currentPage: 1, totalPages: 1, totalRecords: filteredTransactions.length, limit: 50 }}
          onLoadMore={() => {}}
          onRefresh={handleRefresh}
          loading={loading}
          ListHeaderComponent={renderHeader()}
          emptyIcon="Receipt"
          emptyTitle="No Transaction Records"
          emptySubtitle="Your wallet top-ups and amenity booking transactions will appear here."
          contentContainerClassName="px-4 pt-3 pb-28"
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

