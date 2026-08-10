import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BottomSheet, DetailSection, DetailRow, StatusBadge } from '@/components/ui';
import { Button } from '@/components/common';
import { Invoice } from '../store/billingSlice';
import { FileText, Download } from 'lucide-react-native';

interface InvoiceDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPayNowPress?: (invoice: Invoice) => void;
  onDownloadReceiptPress?: (invoice: Invoice) => void;
}

export const InvoiceDetailBottomSheet: React.FC<InvoiceDetailBottomSheetProps> = ({
  visible,
  onClose,
  invoice,
  onPayNowPress,
  onDownloadReceiptPress,
}) => {
  if (!invoice) return null;

  const currencySymbol = '₹';
  const isPaid = invoice.status === 'PAID';
  const isOverdue = invoice.status === 'OVERDUE';
  const badgeVariant = isPaid
    ? 'success'
    : isOverdue
    ? 'danger'
    : invoice.status === 'VERIFICATION_PENDING'
    ? 'warning'
    : 'neutral';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Invoice Summary">
      <ScrollView className="space-y-4 pb-6" showsVerticalScrollIndicator={false}>
        {/* Header Metadata */}
        <View className="flex-row items-center justify-between pb-3 border-b border-border">
          <View className="flex-row items-center space-x-2">
            <FileText size={22} className="text-primary me-2" />
            <View>
              <Text className="text-base font-bold text-foreground text-start">
                {invoice.invoiceNumber || `Invoice #${invoice._id.slice(-6)}`}
              </Text>
              <Text className="text-xs text-muted-foreground text-start">
                Issued: {invoice.date || 'N/A'}
              </Text>
            </View>
          </View>
          <StatusBadge
            label={invoice.status.replace('_', ' ')}
            variant={badgeVariant}
            dot
          />
        </View>

        {/* Amount Summary Section */}
        <View className="bg-muted/50 p-4 rounded-xl items-center my-2">
          <Text className="text-xs font-medium text-muted-foreground uppercase text-start">
            Total Amount Due
          </Text>
          <Text className="text-3xl font-extrabold text-foreground mt-1 text-start">
            {currencySymbol}{(invoice.amount || 0).toLocaleString()}
          </Text>
        </View>

        {/* Key Detail Rows */}
        <DetailSection title="General Details">
          <DetailRow label="Unit / Villa Number" value={invoice.unitNumber || 'Main Residence'} />
          <DetailRow label="Due Date" value={invoice.dueDate || invoice.date || 'Upon Receipt'} />
          <DetailRow label="Payment Method" value={invoice.paymentMethod || '—'} />
          {invoice.offlineReference && (
            <DetailRow label="Offline Bank Ref" value={invoice.offlineReference} copyable />
          )}
        </DetailSection>

        {/* Line Items Breakdown (if available) */}
        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <DetailSection title="Line Items Breakdown">
            {invoice.lineItems.map((item, idx) => (
              <DetailRow
                key={idx}
                label={item.title}
                value={`${currencySymbol}${item.amount.toLocaleString()}`}
              />
            ))}
          </DetailSection>
        )}

        {/* Action Buttons */}
        <View className="pt-4 space-y-2">
          {!isPaid && onPayNowPress && (
            <Button
              variant="default"
              size="lg"
              onPress={() => {
                onClose();
                onPayNowPress(invoice);
              }}
            >
              Pay Invoice Now
            </Button>
          )}

          {isPaid && onDownloadReceiptPress && (
            <Button
              variant="outline"
              size="lg"
              onPress={() => onDownloadReceiptPress(invoice)}
            >
              <Download size={18} className="me-2" />
              Download Official Tax Receipt
            </Button>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default InvoiceDetailBottomSheet;
