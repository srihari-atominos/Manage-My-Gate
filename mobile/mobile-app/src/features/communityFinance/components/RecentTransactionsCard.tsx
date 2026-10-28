import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/icon';
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  RotateCcw,
  Clock,
} from 'lucide-react-native';
import { type NormalizedTransaction } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface RecentTransactionsCardProps {
  transactions: NormalizedTransaction[];
  onViewAllPress: () => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  onViewAllPress,
}) => {
  // Enforce strict 3-item preview limit per Mobile Rule V.1
  const displayTransactions = Array.isArray(transactions) ? transactions.slice(0, 3) : [];

  return (
    <View className="p-5 mb-5 bg-card border border-border/50 rounded-2xl">
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-2.5 pb-2.5 border-b border-border/30">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
            <Icon as={Receipt} size={16} className="text-primary" />
          </View>
          <Text className="text-sm font-bold text-foreground font-sans tracking-tight">
            Recent Activity
          </Text>
        </View>

        {/* View All Header Link */}
        <TouchableOpacity
          onPress={onViewAllPress}
          activeOpacity={0.7}
          className="bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full flex-row items-center gap-1"
          accessibilityRole="button"
          accessibilityLabel="View All Financial Transactions">
          <Text className="text-[11px] font-bold text-primary font-sans">View All</Text>
          <Icon as={ChevronRight} size={12} className="text-primary" />
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      {displayTransactions.length === 0 ? (
        <View className="py-5 items-center justify-center bg-muted/15 rounded-xl border border-dashed border-border/60">
          <Icon as={Clock} size={16} className="text-muted-foreground/60 mb-1" />
          <Text className="text-xs text-muted-foreground font-medium">
            No transactions recorded for this selected period.
          </Text>
        </View>
      ) : (
        <View>
          {displayTransactions.map((tx, index) => {
            const isIncome = tx.type === 'income';
            const isNegative = tx.amount < 0;
            const isRefund =
              isNegative ||
              (tx.description && tx.description.toLowerCase().includes('refund'));

            const dateStr = tx.date
              ? new Date(tx.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Unknown Date';

            const displayAmount =
              isIncome && !isNegative
                ? `+${formatINR(tx.amount)}`
                : isNegative
                ? formatINR(tx.amount)
                : `-${formatINR(tx.amount)}`;

            const isLast = index === displayTransactions.length - 1;

            return (
              <View
                key={tx.id}
                className={`py-2.5 flex-row items-center justify-between ${
                  !isLast ? 'border-b border-border/30' : ''
                }`}>
                {/* Left: Circular Avatar Icon & Details */}
                <View className="flex-row items-center flex-1 min-w-0 pe-2">
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center shrink-0 me-2.5 ${
                      isRefund
                        ? 'bg-amber-500/10'
                        : isIncome
                        ? 'bg-emerald-500/10'
                        : 'bg-slate-500/10'
                    }`}>
                    <Icon
                      as={isRefund ? RotateCcw : isIncome ? ArrowDownLeft : ArrowUpRight}
                      size={14}
                      className={
                        isRefund
                          ? 'text-amber-600 dark:text-amber-400'
                          : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }
                    />
                  </View>

                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-xs font-semibold text-foreground font-sans leading-snug"
                      numberOfLines={1}>
                      {tx.description || (isIncome ? 'Payment Receipt' : 'Expense Payment')}
                    </Text>

                    <View className="flex-row items-center flex-wrap gap-1.5 mt-0.5">
                      <Text className="text-[10px] text-muted-foreground font-sans">{dateStr}</Text>
                      
                    </View>
                  </View>
                </View>

                {/* Right: Amount & Status Badge */}
                <View className="items-end shrink-0 ps-1 max-w-[42%] gap-0.5">
                  <Text
                    numberOfLines={1}
                    className={`text-xs font-bold ${
                      isRefund
                        ? 'text-amber-700 dark:text-amber-400'
                        : isIncome && !isNegative
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-foreground'
                    }`}>
                    {displayAmount}
                  </Text>
                  <StatusBadge
                    variant={
                      tx.status === 'SUCCESS' || tx.status === 'PAID' || tx.status === 'RECONCILED'
                        ? 'success'
                        : (tx.status === 'PENDING' || tx.status === 'RECORDED' || !tx.status) ? 'warning'
                        : tx.status === 'FAILED'
                        ? 'danger'
                        : 'neutral'
                    }
                    label={tx.status === 'RECONCILED' ? 'VERIFIED' : (tx.status === 'RECORDED' || !tx.status ? 'VERIFICATION PENDING' : tx.status)}
                    size="sm"
                    className="py-0.2 px-2 rounded-full"
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default RecentTransactionsCard;
