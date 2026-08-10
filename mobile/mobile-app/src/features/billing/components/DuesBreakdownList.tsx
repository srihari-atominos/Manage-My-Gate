import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui';
import { Button } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { CheckCircle2 } from 'lucide-react-native';
import { StatusVariant } from '@/components/ui/StatusBadge';

interface DuesBreakdownListProps {
  unitBreakdown: any[];
  onPayItemPress: (item: any) => void;
  onViewDetailsPress: (item: any) => void;
  loading?: boolean;
}

export const DuesBreakdownList: React.FC<DuesBreakdownListProps> = ({
  unitBreakdown = [],
  onPayItemPress,
  onViewDetailsPress,
  loading = false,
}) => {
  const currencySymbol = '₹';

  if (!loading && unitBreakdown.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No Outstanding Dues"
        description="All maintenance dues and assessment invoices for your units are fully paid."
      />
    );
  }

  return (
    <View className="space-y-3">
      {unitBreakdown.map((item, index) => {
        const itemAmount = item.amount || item.totalDue || 0;
        const itemStatus = item.status || 'UNPAID';
        const isPaid = itemStatus === 'PAID';
        const isOverdue = itemStatus === 'OVERDUE';
        const unitLabel = item.unitNumber ? `Villa / Unit ${item.unitNumber}` : item.invoiceNumber || `Invoice #${index + 1}`;

        const badgeVariant: StatusVariant = isPaid
          ? 'success'
          : isOverdue
          ? 'danger'
          : itemStatus === 'VERIFICATION_PENDING'
          ? 'warning'
          : 'neutral';

        return (
          <ListCard
            key={item.invoiceId || item._id || index}
            title={unitLabel}
            subtitle={item.period || item.date || item.description || 'Monthly Maintenance Levy'}
            leftIcon="CreditCard"
            leftIconBgColor="#dbeafe"
            leftIconColor="#2563eb"
            status={{
              label: itemStatus.replace('_', ' '),
              variant: badgeVariant,
            }}
            onPress={() => onViewDetailsPress(item)}
            rightContent={
              !isPaid ? (
                <Button
                  variant={isOverdue ? 'destructive' : 'default'}
                  size="sm"
                  onPress={() => onPayItemPress(item)}
                >
                  Pay {currencySymbol}{itemAmount.toLocaleString()}
                </Button>
              ) : null
            }
          />
        );
      })}
    </View>
  );
};

export default DuesBreakdownList;
