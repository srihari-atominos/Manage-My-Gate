import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { Receipt } from 'lucide-react-native';

export interface PaymentReceiptItem {
  _id?: string;
  id?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  unitNumber?: string;
  billingPeriodString?: string;
  totalDue?: number;
  amount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  status?: string;
  paymentMethod?: string;
  createdAt?: string;
  date?: string;
}

export interface PaymentReceiptCardProps {
  invoice: PaymentReceiptItem;
  onViewDetails: (invoiceId: string) => void;
  className?: string;
}

export function PaymentReceiptCard({
  invoice,
  onViewDetails,
  className = '',
}: PaymentReceiptCardProps) {
  const invoiceId = invoice.invoiceId || invoice._id || invoice.id || '';
  const invNo = invoice.invoiceNumber || invoiceId || '—';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : 'Villa Unit';
  const periodStr = invoice.billingPeriodString || 'Current Period';

  const totalBilled = invoice.totalDue ?? invoice.amount ?? 0;
  const paidAmount = invoice.paidAmount ?? (invoice.status === 'PAID' ? totalBilled : 0);
  const remainingBalance = invoice.outstandingAmount ?? Math.max(0, totalBilled - paidAmount);

  const status = invoice.status || 'UNPAID';
  const statusVariant = getStatusVariant(status);
  const statusLabel = status.replace(/_/g, ' ');
  const isPaid = status === 'PAID';

  const dateStr = invoice.createdAt || invoice.date
    ? new Date(invoice.createdAt || invoice.date!).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent Record';

  return (
    <ListCard
      title={invNo}
      subtitle={`${unitStr} • ${periodStr}`}
      leftIcon={Receipt}
      status={{ label: statusLabel, variant: statusVariant }}
      showChevron={false}
      onPress={() => onViewDetails(invoiceId)}
      className={`mb-3 ${className}`}
    >
      {/* Financial Figures Breakdown Grid */}
      <View className="bg-muted/40 border border-border/50 rounded-xl p-3 my-2 flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-muted-foreground">Total Billed</Text>
          <Text className="text-sm font-bold text-foreground mt-0.5">
            ₹{totalBilled.toLocaleString('en-IN')}
          </Text>
        </View>

        <View className="items-center">
          <Text className="text-xs text-muted-foreground">Amount Paid</Text>
          <Text className="text-sm font-bold text-status-success mt-0.5">
            ₹{paidAmount.toLocaleString('en-IN')}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-xs text-muted-foreground">Remaining</Text>
          <Text className="text-sm font-bold text-foreground mt-0.5">
            ₹{remainingBalance.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Action Row: Payment Method / Date & Receipt Trigger */}
      <View className="flex-row items-center justify-between pt-1 border-t border-border/60">
        <View className="flex-row items-center">
          {invoice.paymentMethod ? (
            <Text className="text-xs text-muted-foreground font-medium">
              Method: <Text className="font-bold text-foreground">{invoice.paymentMethod}</Text>
            </Text>
          ) : (
            <Text className="text-xs text-muted-foreground font-medium">
              {dateStr}
            </Text>
          )}
        </View>

        <Button
          variant={isPaid ? 'default' : 'secondary'}
          size="sm"
          onPress={() => onViewDetails(invoiceId)}
          accessibilityRole="button"
          accessibilityLabel={isPaid ? `View Receipt for ${invNo}` : `View Details for ${invNo}`}
        >
          {isPaid ? 'Receipt' : 'Details'}
        </Button>
      </View>
    </ListCard>
  );
}

export default PaymentReceiptCard;
