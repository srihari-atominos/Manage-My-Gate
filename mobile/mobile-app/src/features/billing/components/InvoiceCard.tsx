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

  const amount =
    invoice.totalDue ??
    invoice.amount ??
    (invoice as any).totalAmount ??
    (invoice as any).outstandingAmount ??
    (invoice as any).currentCharge ??
    0;
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;

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

  return (
    <ListCard
      title={(invoice as any).assessmentName || invNo}
      subtitle={subtitle}
      leftIcon={leftIcon}
      status={{
        label: statusLabel,
        variant: statusVariant,
      }}
      timestamp={invoice.billingPeriodString || invoice.date}
      onPress={onPress}
      className={className}
      rightContent={
        <Text className="text-foreground font-bold text-base ms-2">
          {formattedAmount}
        </Text>
      }
    />
  );
}

export default InvoiceCard;


