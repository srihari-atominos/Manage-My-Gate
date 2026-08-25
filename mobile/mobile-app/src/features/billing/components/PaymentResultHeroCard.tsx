import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, getStatusVariant, type StatusVariant } from '@/components/ui/StatusBadge';
import { CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react-native';
import { InvoiceStatus } from '../types';

export interface PaymentResultHeroCardProps {
  status: InvoiceStatus | string;
  amount: number;
  paidAmount?: number;
  remainingDue?: number;
  invoiceNumber?: string;
  unitName?: string;
  reference?: string;
  className?: string;
}

interface OutcomeConfig {
  icon: any;
  iconBgClass: string;
  iconTextClass: string;
  badgeVariant: StatusVariant;
  title: string;
  description: string;
}

function resolveOutcomeConfig({
  isPaid,
  isPartial,
  isPending,
  isFailed,
  isCancelled,
  invoiceNumber,
  unitName,
  reference,
  remainingDue,
  defaultVariant,
}: {
  isPaid: boolean;
  isPartial: boolean;
  isPending: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  invoiceNumber: string;
  unitName: string;
  reference: string;
  remainingDue: number;
  defaultVariant: StatusVariant;
}): OutcomeConfig {
  if (isPaid) {
    return {
      icon: CheckCircle2,
      iconBgClass: 'bg-status-success/15',
      iconTextClass: 'text-status-success',
      badgeVariant: 'success',
      title: 'Payment Confirmed!',
      description: `Invoice #${invoiceNumber} for ${unitName} has been fully settled.`,
    };
  }

  if (isPartial) {
    return {
      icon: Clock,
      iconBgClass: 'bg-status-warning/15',
      iconTextClass: 'text-status-warning',
      badgeVariant: 'warning',
      title: 'Partial Payment Received',
      description: `Partially settled balance. Remaining due: ₹${remainingDue.toLocaleString('en-IN')}.`,
    };
  }

  if (isPending) {
    return {
      icon: Clock,
      iconBgClass: 'bg-primary/10',
      iconTextClass: 'text-primary',
      badgeVariant: 'info',
      title: 'Submitted for Verification',
      description: `Offline ref #${reference} submitted and pending admin clearance verification.`,
    };
  }

  if (isFailed) {
    return {
      icon: XCircle,
      iconBgClass: 'bg-destructive/15',
      iconTextClass: 'text-destructive',
      badgeVariant: 'danger',
      title: 'Payment Failed',
      description: 'Your transaction could not be completed by the gateway.',
    };
  }

  if (isCancelled) {
    return {
      icon: AlertCircle,
      iconBgClass: 'bg-muted',
      iconTextClass: 'text-muted-foreground',
      badgeVariant: 'neutral',
      title: 'Payment Cancelled',
      description: 'No funds were deducted from your account.',
    };
  }

  return {
    icon: RefreshCw,
    iconBgClass: 'bg-muted',
    iconTextClass: 'text-muted-foreground',
    badgeVariant: defaultVariant,
    title: 'Payment Status Unknown',
    description: 'Network status unknown. Please check payment status before retrying.',
  };
}

export function PaymentResultHeroCard({
  status,
  amount,
  paidAmount,
  remainingDue = 0,
  invoiceNumber = '—',
  unitName = 'Villa Unit',
  reference = '—',
  className = '',
}: PaymentResultHeroCardProps) {
  const normStatus = (status || 'UNPAID') as InvoiceStatus;
  const statusVariant = getStatusVariant(normStatus);

  const isPaid = normStatus === 'PAID';
  const isPartial = normStatus === 'PARTIALLY_PAID' || ((paidAmount || 0) > 0 && remainingDue > 0);
  const isPending = normStatus === 'VERIFICATION_PENDING';
  const isFailed = normStatus === 'FAILED';
  const isCancelled = normStatus === 'CANCELLED';

  const displayAmount = isPaid ? amount : (paidAmount || amount);

  const outcome = resolveOutcomeConfig({
    isPaid,
    isPartial,
    isPending,
    isFailed,
    isCancelled,
    invoiceNumber,
    unitName,
    reference,
    remainingDue,
    defaultVariant: statusVariant,
  });

  return (
    <View className={`bg-card border border-border rounded-2xl p-6 items-center shadow-xs ${className}`}>
      {/* Header Outcome Icon */}
      <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${outcome.iconBgClass}`}>
        <Icon as={outcome.icon} size={36} className={outcome.iconTextClass} />
      </View>

      {/* Main Headline Title */}
      <Text className="text-xl font-extrabold text-foreground text-center mb-1">
        {outcome.title}
      </Text>

      {/* Numerical Amount */}
      <Text className="text-3xl font-black text-foreground tracking-tight my-1">
        ₹{displayAmount.toLocaleString('en-IN')}
      </Text>

      {/* Contextual Subtitle Description */}
      <Text className="text-xs text-muted-foreground text-center mt-1 px-4 leading-relaxed">
        {outcome.description}
      </Text>

      {/* Status Pill Badge */}
      <View className="mt-3">
        <StatusBadge label={normStatus.replace(/_/g, ' ')} variant={outcome.badgeVariant} dot />
      </View>
    </View>
  );
}

export default PaymentResultHeroCard;
