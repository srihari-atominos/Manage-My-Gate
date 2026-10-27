import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Receipt,
  ChevronRight,
} from 'lucide-react-native';
import { type NormalizedTransaction } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface TransactionItemCardProps {
  transaction: NormalizedTransaction;
  onPress: () => void;
}

export const TransactionItemCard: React.FC<TransactionItemCardProps> = ({
  transaction,
  onPress,
}) => {
  const isIncome = transaction.type === 'income';
  const isRefund =
    transaction.amount < 0 ||
    (transaction.description && transaction.description.toLowerCase().includes('refund'));
  const isNegative = transaction.amount < 0;

  // Format date safely
  const formattedDate = transaction.date
    ? new Date(transaction.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date not available';

  // Determine status badge variant
  let statusVariant: StatusVariant = 'neutral';
  const upperStatus = (transaction.status || '').toUpperCase();
  if (upperStatus === 'SUCCESS' || upperStatus === 'PAID' || upperStatus === 'RECONCILED') {
    statusVariant = 'success';
  } else if (upperStatus === 'PENDING' || upperStatus === 'VERIFICATION_PENDING' || upperStatus === 'RECORDED') {
    statusVariant = 'warning';
  } else if (upperStatus === 'FAILED' || upperStatus === 'VOIDED' || upperStatus === 'UNPAID') {
    statusVariant = 'danger';
  } else if (upperStatus === 'REFUNDED') {
    statusVariant = 'critical';
  }

  // Format amount with appropriate sign
  let displayAmount: string;
  if (isIncome && !isNegative) {
    displayAmount = `+${formatINR(transaction.amount)}`;
  } else {
    displayAmount = isNegative ? formatINR(transaction.amount) : `-${formatINR(transaction.amount)}`;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Transaction ${transaction.description || 'Details'}, ${displayAmount}`}
      className="mb-3 p-4 bg-card border border-border/40 rounded-3xl shadow-sm active:bg-secondary/40">
      <View className="flex-row items-center justify-between">
        {/* Left: Avatar / Identity (UserCard style) */}
        <View className="flex-row items-center flex-1 min-w-0 me-2">
          {/* Circular Avatar Container */}
          <View
            className={`w-12 h-12 rounded-full border-2 items-center justify-center me-3.5 shrink-0 shadow-sm ${
              isRefund
                ? 'bg-amber-500/10 border-amber-500/20'
                : isIncome
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-slate-500/10 border-slate-500/20'
            }`}>
            <Icon
              as={isRefund ? RotateCcw : isIncome ? ArrowDownLeft : ArrowUpRight}
              size={18}
              className={
                isRefund
                  ? 'text-amber-600 dark:text-amber-400'
                  : isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400'
              }
            />
          </View>

          {/* Description & Metadata */}
          <View className="flex-1 min-w-0">
            <Text
              className="text-[15px] font-bold text-foreground font-sans tracking-tight"
              numberOfLines={1}>
              {transaction.description || (isIncome ? 'Payment Receipt' : 'Expense Payment')}
            </Text>

            <Text className="text-[12px] text-muted-foreground font-sans mt-0.5">
              {formattedDate}
            </Text>

            {/* Tags row */}
            <View className="flex-row items-center flex-wrap gap-1.5 mt-2">
              <View className="bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-primary font-sans uppercase">
                  {transaction.domain || (isIncome ? 'INVOICE' : 'EXPENSE')}
                </Text>
              </View>

              {transaction.receiptNumber ? (
                <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5 bg-muted/60 border border-border/50">
                  <Icon as={Receipt} size={9} className="text-muted-foreground shrink-0" />
                  <Text className="text-[10px] text-muted-foreground font-medium" numberOfLines={1}>
                    {transaction.receiptNumber}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Right: Amount & Status Badge */}
        <View className="items-end shrink-0 gap-1.5">
          <Text
            numberOfLines={1}
            className={`text-[15px] font-bold ${
              isRefund
                ? 'text-amber-700 dark:text-amber-400'
                : isIncome && !isNegative
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-foreground'
            }`}>
            {displayAmount}
          </Text>

          <StatusBadge
            variant={statusVariant}
            label={transaction.status || 'RECORDED'}
            size="sm"
            className="py-1 px-2.5 rounded-full shadow-sm"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TransactionItemCard;
