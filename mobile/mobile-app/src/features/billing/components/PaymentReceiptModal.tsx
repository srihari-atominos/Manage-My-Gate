import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CheckCircle2, Download, Printer, Receipt } from 'lucide-react-native';
import { generateInvoiceHtml, exportInvoiceHtmlDocument } from '../utils/invoicePdfUtility';

export interface PaymentReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: any | null;
  amountPaid?: number;
  paymentMethod?: string;
  communityName?: string;
}

export function PaymentReceiptModal({
  visible,
  onClose,
  invoice,
  amountPaid,
  paymentMethod,
  communityName = 'Community Workspace',
}: PaymentReceiptModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice._id || '—';
  const assessmentTitle =
    invoice.assessmentName ||
    invoice.snapshot?.assessmentName ||
    'Community Maintenance Assessment';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : 'Villa Unit';
  const effectivePaid = amountPaid ?? invoice.paidAmount ?? invoice.totalDue ?? 0;
  const remainingDue =
    invoice.outstandingAmount !== undefined
      ? invoice.outstandingAmount
      : Math.max(0, (invoice.totalDue || 0) - effectivePaid);

  const effectiveMethod =
    paymentMethod || invoice.paymentMethod || 'Online Payment';

  const handlePdfAction = async (action: 'download' | 'print') => {
    try {
      setIsExporting(true);
      const targetInvoice = {
        ...invoice,
        paidAmount: effectivePaid,
        outstandingAmount: remainingDue,
        status: remainingDue === 0 ? 'PAID' : 'PARTIALLY_PAID',
        paymentMethod: effectiveMethod,
      };

      const html = generateInvoiceHtml(targetInvoice, {
        communityName,
        residentName: invoice.residentName || invoice.targetUser || 'Resident Owner',
      });

      const filename = `Invoice_${invNo}_Receipt.html`;
      await exportInvoiceHtmlDocument(html, filename, `Invoice Statement #${invNo}`, { action });
      setIsExporting(false);
    } catch (err: any) {
      setIsExporting(false);
      Alert.alert('PDF Export Failed', err?.message || 'Unable to render invoice PDF.');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Receipt • #${invNo}`}>
      <View className="py-2 pb-3 gap-4">
        {/* Success Header Box */}
        <View className="bg-status-success/10 border border-status-success/30 rounded-2xl p-5 items-center justify-center">
          <View className="w-12 h-12 rounded-full bg-status-success/20 items-center justify-center mb-2">
            <Icon as={CheckCircle2} size={28} className="text-status-success" />
          </View>
          <Text className="font-extrabold text-lg text-foreground text-center">
            Payment Completed!
          </Text>
          <Text className="text-xs text-muted-foreground text-center mt-1">
            ₹{effectivePaid.toLocaleString('en-IN')} received via {effectiveMethod} for {unitStr}.
          </Text>

          <View className="mt-3 flex-row items-center gap-2">
            <StatusBadge
              label={remainingDue === 0 ? 'FULLY PAID' : 'PARTIALLY PAID'}
              variant={remainingDue === 0 ? 'success' : 'warning'}
            />
            {remainingDue > 0 ? (
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Remaining: ₹{remainingDue.toLocaleString('en-IN')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Assessment Purpose Card */}
        <View className="bg-muted/40 border border-border/60 rounded-xl p-3.5 gap-1.5">
          <Text className="text-xs text-muted-foreground font-medium">Assessment Purpose</Text>
          <Text className="font-bold text-sm text-foreground">{assessmentTitle}</Text>
          <Text className="text-xs text-muted-foreground">
            Invoice #{invNo} • {unitStr}
          </Text>
        </View>

        {/* Invoice PDF Actions */}
        <View className="bg-card border border-border rounded-xl p-4 gap-3">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Statement & Invoice Documents
          </Text>

          <View className="flex-row gap-2.5">
            <Button
              variant="outline"
              size="default"
              className="flex-1 flex-row items-center justify-center gap-2 border-primary/40 bg-primary/10"
              onPress={() => handlePdfAction('print')}
              disabled={isExporting}
              accessibilityRole="button"
              accessibilityLabel="View PDF Invoice"
            >
              <Icon as={Printer} size={16} className="text-primary" />
              <Text className="text-primary font-bold text-sm">View PDF</Text>
            </Button>

            <Button
              variant="default"
              size="default"
              className="flex-1 flex-row items-center justify-center gap-2 bg-primary"
              onPress={() => handlePdfAction('download')}
              disabled={isExporting}
              accessibilityRole="button"
              accessibilityLabel="Download PDF Invoice"
            >
              <Icon as={Download} size={16} className="text-primary-foreground" />
              <Text className="text-primary-foreground font-bold text-sm">Download PDF</Text>
            </Button>
          </View>
        </View>

        <Button
          variant="secondary"
          size="lg"
          className="w-full mt-1"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text className="font-bold text-sm text-foreground">Done</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}

export default PaymentReceiptModal;
