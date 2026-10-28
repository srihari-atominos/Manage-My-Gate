import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { type NormalizedTransaction } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface TransactionDetailSheetProps {
  transaction: NormalizedTransaction | null;
  visible: boolean;
  onClose: () => void;
}

export const TransactionDetailSheet: React.FC<TransactionDetailSheetProps> = ({
  transaction,
  visible,
  onClose,
}) => {
  const router = useRouter();
  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const isRefund =
    transaction.amount < 0 ||
    (transaction.description && transaction.description.toLowerCase().includes('refund'));
  const isNegative = transaction.amount < 0;

  const formattedDate = transaction.date
    ? new Date(transaction.date).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not available';

  const formattedCreatedAt = transaction.createdAt
    ? new Date(transaction.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const formattedUpdatedAt = transaction.updatedAt
    ? new Date(transaction.updatedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

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

  let displayAmount: string;
  if (isIncome && !isNegative) {
    displayAmount = `+${formatINR(transaction.amount)}`;
  } else {
    displayAmount = isNegative
      ? formatINR(transaction.amount)
      : `-${formatINR(transaction.amount)}`;
  }

  const accentColorClass = isRefund
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
    : isIncome
    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
    : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700';

  const amountColorClass = isRefund
    ? 'text-amber-700 dark:text-amber-400'
    : isIncome && !isNegative
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-foreground';

  const iconColorClass = isRefund
    ? 'text-amber-600 dark:text-amber-400'
    : isIncome
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-slate-600 dark:text-slate-400';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Transaction Details">
      <View className="pt-1 pb-6">

        {/* ── Hero Amount Block (UserCard style) ── */}
        <View className="items-center px-4 py-5 mb-4 bg-muted/20 rounded-3xl border border-border/40 mx-1">
          {/* Circular Type Icon Avatar */}
          <View className={`w-12 h-12 rounded-full border-2 items-center justify-center mb-3 shadow-sm ${accentColorClass}`}>
            <Icon
              as={isRefund ? RotateCcw : isIncome ? ArrowDownLeft : ArrowUpRight}
              size={20}
              className={iconColorClass}
            />
          </View>

          {/* Amount */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className={`text-[30px] font-bold tracking-tight leading-none mb-1 ${amountColorClass}`}>
            {displayAmount}
          </Text>

          {/* Sub-label */}
          <Text className="text-[11px] text-muted-foreground font-medium mb-3">
            {transaction.currency || 'INR'} ·{' '}
            {isRefund ? 'Adjustment / Refund' : isIncome ? 'Income' : 'Expense'}
          </Text>

          {/* Status badge */}
          <StatusBadge
            variant={statusVariant}
            label={(transaction.status === 'RECONCILED' ? 'VERIFIED' : transaction.status) || 'RECORDED'}
            size="md"
            className="py-1 px-3 rounded-full shadow-sm"
          />
        </View>

        {/* ── Transaction Information ── */}
        <DetailSection title="Transaction Information" iconName="Receipt">
          <DetailRow
            label="Description"
            value={transaction.description || 'Community Transaction'}
            iconName="Tag"
          />
          <DetailRow
            label="Category / Domain"
            value={transaction.domain || 'INVOICE'}
            iconName="Building"
          />
          <DetailRow
            label="Date & Time"
            value={formattedDate}
            iconName="Calendar"
          />
          <DetailRow
            label="Payment Mode"
            value={transaction.paymentMethod || 'OTHER'}
            iconName="CreditCard"
          />
          {transaction.receiptNumber ? (
            <DetailRow
              label="Receipt / Reference #"
              value={transaction.receiptNumber}
              copyable
              iconName="Hash"
            />
          ) : null}
        </DetailSection>

        {/* ── Audit Tracing ── */}
        <DetailSection title="Reference & Verification" iconName="Hash">
          <DetailRow
            label="Transaction ID"
            value={transaction.id}
            copyable
            iconName="Hash"
          />
          {transaction.referenceId ? (
            <DetailRow
              label={`${transaction.referenceType || 'Source'} Reference`}
              value={transaction.referenceId}
              copyable
              iconName="Tag"
            />
          ) : null}
          {formattedCreatedAt ? (
            <DetailRow
              label="Recorded In Ledger"
              value={formattedCreatedAt}
              iconName="Clock"
            />
          ) : null}
          {formattedUpdatedAt ? (
            <DetailRow
              label="Verified At"
              value={formattedUpdatedAt}
              isLast
              iconName="Clock"
            />
          ) : null}
        </DetailSection>

        {/* Immutability notice */}
        <View className="flex-row items-center gap-2.5 px-3.5 py-3 mb-4 rounded-xl bg-muted/30 border border-border/40">
          <Icon as={ShieldCheck} size={15} className="text-muted-foreground/70 shrink-0" />
          <Text className="text-[10px] text-muted-foreground flex-1 leading-relaxed">
            This record is permanently committed to the community ledger for audit compliance.
          </Text>
        </View>

        {/* Action: Settle / Mark as Paid */}
        {transaction.domain === 'EXPENSE' && (upperStatus === 'UNPAID' || upperStatus === 'PENDING') ? (
          <Button
            onPress={() => {
              onClose();
              router.push({
                pathname: '/(resident)/admin/billing/expenses/[id]',
                params: { id: transaction.referenceId },
              } as any);
            }}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 mb-2.5 shadow-xs"
            accessibilityRole="button"
            accessibilityLabel="View and mark expense as paid">
            <Text className="font-bold text-white">Settle / Mark as Paid</Text>
          </Button>
        ) : null}

        {/* Close */}
        <Button
          variant="outline"
          onPress={onClose}
          className="w-full rounded-xl"
          accessibilityRole="button"
          accessibilityLabel="Close transaction details">
          <Text className="font-semibold text-foreground">Close</Text>
        </Button>
      </View>
    </BottomSheet>
  );
};

export default TransactionDetailSheet;
