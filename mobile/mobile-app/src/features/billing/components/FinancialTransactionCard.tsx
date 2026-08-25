import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';

export type FinancialTransactionType =
  | 'CREDIT'
  | 'DEBIT'
  | 'TOP_UP'
  | 'PAYMENT'
  | 'REFUND'
  | 'INVOICE'
  | 'SETTLEMENT'
  | string;

export interface FinancialTransactionItem {
  _id?: string;
  id?: string;
  type?: FinancialTransactionType;
  title?: string;
  description?: string;
  amount: number;
  createdAt?: string;
  date?: string;
  timestamp?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  referenceId?: string;
  category?: string;
}

export interface FinancialTransactionCardProps {
  transaction: FinancialTransactionItem;
  onPress?: () => void;
  className?: string;
}

export function FinancialTransactionCard({
  transaction,
  onPress,
  className = '',
}: FinancialTransactionCardProps) {
  const rawType = (transaction.type || 'DEBIT').toUpperCase();
  const isCredit =
    rawType === 'CREDIT' ||
    rawType === 'TOP_UP' ||
    rawType === 'REFUND';

  const titleStr =
    transaction.title ||
    transaction.description ||
    (isCredit ? 'Wallet Top-Up' : 'Fee Settlement');

  const rawDate = transaction.createdAt || transaction.date || transaction.timestamp;
  const dateStr = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  const methodOrRef =
    transaction.paymentMethod ||
    transaction.category ||
    (transaction.referenceId ? `Ref: ${transaction.referenceId.slice(-6)}` : 'WALLET');

  const subtitleStr = `${dateStr} • ${methodOrRef}`;

  const amountNum = Math.abs(transaction.amount || 0);
  const formattedAmount = `${isCredit ? '+' : '-'} ₹${amountNum.toLocaleString('en-IN')}`;

  const rawStatus = (transaction.paymentStatus || transaction.status || 'COMPLETED').toUpperCase();
  const statusVariant: StatusVariant =
    rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS' || rawStatus === 'PAID'
      ? 'success'
      : rawStatus === 'REFUNDED'
      ? 'info'
      : rawStatus === 'FAILED'
      ? 'danger'
      : 'warning';

  return (
    <ListCard
      title={titleStr}
      subtitle={subtitleStr}
      leftIcon={isCredit ? 'ArrowDownLeft' : 'ArrowUpRight'}
      leftIconBgColor={isCredit ? 'bg-status-success/15' : 'bg-destructive/15'}
      status={{
        label: rawStatus.replace(/_/g, ' '),
        variant: statusVariant,
      }}
      rightContent={
        <View className="items-end justify-center ms-2 shrink-0">
          <Text
            className={`text-base font-extrabold ${
              isCredit ? 'text-status-success' : 'text-foreground'
            }`}
          >
            {formattedAmount}
          </Text>
        </View>
      }
      onPress={onPress}
      className={className}
    />
  );
}

export default FinancialTransactionCard;
