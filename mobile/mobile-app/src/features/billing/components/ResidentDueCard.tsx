import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { UnitDueBreakdown, InvoiceStatus, Invoice } from '../types';

export interface ResidentDueCardProps {
  item: UnitDueBreakdown;
  onViewDetails: (invoiceId: string) => void;
  onPayNow: (invoice: Invoice) => void;
  className?: string;
}

export function ResidentDueCard({
  item,
  onViewDetails,
  onPayNow,
  className = '',
}: ResidentDueCardProps) {
  const invoiceId = item.invoiceId || (item as any)._id || '';
  const invNo = item.invoiceNumber || invoiceId || '—';
  const unitStr = item.unitNumber ? `Villa ${item.unitNumber}` : 'Villa Unit';
  const periodStr = item.billingPeriodString || 'Current Month';
  const totalDue = item.totalDue || 0;
  const paidAmount = item.paidAmount || 0;
  const remainingDue = item.outstandingAmount !== undefined
    ? item.outstandingAmount
    : Math.max(0, totalDue - paidAmount);
  const formattedDue = `₹${remainingDue.toLocaleString('en-IN')}`;

  const statusVariant = getStatusVariant(item.status);
  const statusLabel = item.status ? item.status.replace(/_/g, ' ') : 'UNPAID';
  const isPendingVerification = item.status === ('VERIFICATION_PENDING' as InvoiceStatus);

  const mappedInvoice: Invoice = {
    _id: invoiceId,
    invoiceNumber: invNo,
    unitNumber: item.unitNumber,
    billingPeriodString: periodStr,
    totalDue,
    paidAmount,
    outstandingAmount: remainingDue,
    status: item.status,
  } as Invoice;

  return (
    <ListCard
      title={invNo}
      subtitle={`${unitStr} • ${periodStr}`}
      leftIcon="Receipt"
      leftIconBgColor="bg-primary/10"
      status={{
        label: statusLabel,
        variant: statusVariant,
      }}
      onPress={() => onViewDetails(invoiceId)}
      className={className}
    >
      {/* Card Amount & Actions Footer */}
      <View className="border-t border-border/50 pt-3 mt-1 flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-muted-foreground">Remaining Liability</Text>
          <Text className="text-lg font-extrabold text-foreground mt-0.5">
            {formattedDue}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onPress={() => onViewDetails(invoiceId)}
            accessibilityRole="button"
            accessibilityLabel={`View Details for ${invNo}`}
          >
            Details
          </Button>

          {!isPendingVerification ? (
            <Button
              variant="default"
              size="sm"
              onPress={() => onPayNow(mappedInvoice)}
              accessibilityRole="button"
              accessibilityLabel={`Pay Now for ${invNo}`}
            >
              Pay Now
            </Button>
          ) : (
            <View className="bg-primary/10 px-2.5 py-1.5 rounded-lg">
              <Text className="text-primary text-xs font-semibold">
                Pending
              </Text>
            </View>
          )}
        </View>
      </View>
    </ListCard>
  );
}

export default ResidentDueCard;
