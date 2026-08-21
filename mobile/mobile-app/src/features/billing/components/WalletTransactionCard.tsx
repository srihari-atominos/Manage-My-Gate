import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';

export interface WalletTransactionItem {
  _id?: string;
  id?: string;
  type: string;
  description?: string;
  amount: number;
  createdAt?: string;
  date?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
}

export interface WalletTransactionCardProps {
  transaction: WalletTransactionItem;
  onPress?: () => void;
  className?: string;
}

export function WalletTransactionCard({
  transaction,
  onPress,
  className = '',
}: WalletTransactionCardProps) {
  const isCredit =
    transaction.type?.toUpperCase() === 'CREDIT' ||
    transaction.type?.toUpperCase() === 'TOP_UP' ||
    transaction.type?.toUpperCase() === 'REFUND';

  const titleStr =
    transaction.description ||
    (isCredit ? 'Wallet Top-Up' : 'Fee Settlement');

  const rawDate = transaction.createdAt || transaction.date;
  const dateStr = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  const methodStr = transaction.paymentMethod || 'WALLET';
  const amountNum = transaction.amount || 0;
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
      subtitle={`${dateStr} • ${methodStr}`}
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

export default WalletTransactionCard;
