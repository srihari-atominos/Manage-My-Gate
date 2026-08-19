import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { Invoice } from '../types';

export interface InvoiceCardProps {
  invoice: Invoice;
  onPress: () => void;
  className?: string;
}

export function InvoiceCard({ invoice, onPress, className }: InvoiceCardProps) {
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

  // Dynamic status-driven icon styling
  let leftIcon = 'Receipt';
  let leftIconBgColor = '#f1f5f9';
  let leftIconColor = '#475569';

  if (status === 'PAID') {
    leftIcon = 'CheckCircle2';
    leftIconBgColor = '#dcfce7';
    leftIconColor = '#166534';
  } else if (status === 'VERIFICATION_PENDING') {
    leftIcon = 'Clock';
    leftIconBgColor = '#fef3c7';
    leftIconColor = '#b45309';
  } else if (status === 'UNPAID' || status === 'OVERDUE') {
    leftIcon = 'AlertCircle';
    leftIconBgColor = '#ffe4e6';
    leftIconColor = '#9f1239';
  }

  return (
    <ListCard
      title={(invoice as any).assessmentName || invNo}
      subtitle={subtitle}
      leftIcon={leftIcon}
      leftIconBgColor={leftIconBgColor}
      leftIconColor={leftIconColor}
      timestamp={invoice.billingPeriodString || invoice.date}
      onPress={onPress}
      className={className}
      rightContent={
        <View className="items-end justify-center ms-2 gap-1 shrink-0">
          <Text className="text-foreground font-bold text-base">{formattedAmount}</Text>
          <StatusBadge label={statusLabel} variant={statusVariant} size="sm" />
        </View>
      }
    />
  );
}

export default InvoiceCard;
