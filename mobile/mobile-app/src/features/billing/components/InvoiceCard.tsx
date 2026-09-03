import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { Invoice } from '../types';

export interface InvoiceCardProps {
  invoice: Invoice;
  onPress: () => void;
  className?: string;
}

export function InvoiceCard({ invoice, onPress, className = '' }: InvoiceCardProps) {
  const invNo = invoice.invoiceNumber || invoice._id || '—';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : '—';
  const residentStr = invoice.targetUser || 'Resident';
  const subtitle = `${unitStr} • ${residentStr}`;

  const totalAmount =
    (invoice as any).totalAmount ??
    invoice.totalDue ??
    invoice.amount ??
    0;
  const outstandingAmount =
    (invoice as any).outstandingAmount ??
    invoice.totalDue ??
    invoice.amount ??
    0;
  const isPartial = invoice.status === 'PARTIALLY_PAID';
  const displayAmount = isPartial ? outstandingAmount : (invoice.totalDue ?? invoice.amount ?? totalAmount);
  const formattedAmount = `₹${displayAmount.toLocaleString('en-IN')}`;

  const status = invoice.status || 'UNPAID';
  const statusVariant = getStatusVariant(status);
  const statusLabel = status.replace(/_/g, ' ');

  // Dynamic status-driven icon symbol
  let leftIcon = 'Receipt';
  if (status === 'PAID') {
    leftIcon = 'CheckCircle2';
  } else if (status === 'VERIFICATION_PENDING') {
    leftIcon = 'Clock';
  } else if (status === 'UNPAID' || status === 'OVERDUE') {
    leftIcon = 'AlertCircle';
  }

  let displayDate = invoice.billingPeriodString || invoice.date || '';
  if (displayDate && typeof displayDate === 'string' && !invoice.billingPeriodString) {
    const d = new Date(displayDate);
    if (!isNaN(d.getTime())) {
      displayDate = d.toLocaleDateString();
    }
  } else if ((displayDate as unknown) instanceof Date) {
    displayDate = ((displayDate as unknown) as Date).toLocaleDateString();
  }

  return (
    <ListCard
      title={(invoice as any).assessmentName || invNo}
      subtitle={subtitle}
      leftIcon={leftIcon}
      status={{
        label: statusLabel,
        variant: statusVariant,
      }}
      timestamp={displayDate}
      disableRelativeTime={true}
      onPress={onPress}
      className={className}
      rightContent={
        <View className="items-end ms-2">
          <Text className="text-foreground font-bold text-base">
            {formattedAmount}
          </Text>
          {isPartial && totalAmount > outstandingAmount ? (
            <Text className="text-muted-foreground text-[10px]">
              Due of ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          ) : null}
        </View>
      }
    />
  );
}

export default InvoiceCard;


