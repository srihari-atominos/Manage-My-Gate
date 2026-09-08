import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CheckCircle2, Download, Printer, Receipt } from 'lucide-react-native';
import { generateInvoiceHtml, exportInvoiceHtmlDocument } from '../utils/invoicePdfUtility';
import { useAuth } from '@/src/features/auth/hooks/useAuth';

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
  const { user } = useAuth();

  if (!invoice) return null;

  // Resolve Resident's Villa / Unit from invoice or resident profile
  const residentVillaNumber =
    (user as any)?.villaNumber ||
    (user as any)?.activeVillaNumber ||
    (user as any)?.unitNumber ||
    '';

  const rawUnit =
    invoice.unitNumber ||
    invoice.unit ||
    invoice.villaNumber ||
    invoice.snapshot?.unitDetails?.unitNumber ||
    residentVillaNumber ||
    '';

  const unitStr = rawUnit
    ? (String(rawUnit).trim().toLowerCase().startsWith('villa') ? String(rawUnit).trim() : `Villa ${String(rawUnit).trim()}`)
    : 'Villa Unit';

  const invNo =
    invoice.invoiceNumber ||
    invoice.invoiceId ||
    invoice._id ||
    '—';

  const assessmentTitle =
    invoice.assessmentName ||
    invoice.snapshot?.assessmentName ||
    invoice.title ||
    invoice.purpose ||
    invoice.assessmentPurpose ||
    'Community Maintenance Assessment';

  const effectivePaid =
    amountPaid !== undefined && amountPaid !== null && Number(amountPaid) > 0
      ? Number(amountPaid)
      : (invoice.amountPaid !== undefined && invoice.amountPaid !== null && Number(invoice.amountPaid) > 0
          ? Number(invoice.amountPaid)
          : (invoice.paidAmount !== undefined && invoice.paidAmount !== null && Number(invoice.paidAmount) > 0
              ? Number(invoice.paidAmount)
              : Number(invoice.totalDue || invoice.totalAmount || 0)));

  const totalLiability = Number(invoice.totalDue || invoice.totalAmount || invoice.currentCharge || 0);

  let remainingDue = 0;
  if (invoice.outstandingAmount !== undefined && Number(invoice.outstandingAmount) >= 0) {
    remainingDue = Number(invoice.outstandingAmount);
  } else if (totalLiability > 0) {
    remainingDue = Math.max(0, totalLiability - effectivePaid);
  }

  // Safety check: if effectivePaid is less than totalLiability and remaining was calculated as 0, calculate true remaining
  if (totalLiability > 0 && effectivePaid < totalLiability && remainingDue <= 0) {
    remainingDue = totalLiability - effectivePaid;
  }

  const isFullyPaid = remainingDue <= 0.01;

  const effectiveMethod =
    paymentMethod ||
    invoice.paymentMethod ||
    (invoice.selectedMethod === 'WALLET' ? 'Digital Wallet' : 'Online Payment');

  const handlePdfAction = async (action: 'download' | 'print') => {
    try {
      setIsExporting(true);
      const targetInvoice = {
        ...invoice,
        unitNumber: rawUnit || 'Unit',
        assessmentName: assessmentTitle,
        paidAmount: effectivePaid,
        outstandingAmount: remainingDue,
        status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        paymentMethod: effectiveMethod,
      };

      const html = generateInvoiceHtml(targetInvoice, {
        communityName,
        residentName: invoice.residentName || invoice.targetUser || (user as any)?.name || 'Resident Owner',
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
            {isFullyPaid ? 'Payment Completed!' : 'Partial Payment Received!'}
          </Text>
          <Text className="text-xs text-muted-foreground text-center mt-1">
            ₹{effectivePaid.toLocaleString('en-IN')} received via {effectiveMethod} for {unitStr}.
          </Text>

          <View className="mt-3 flex-row items-center gap-2">
            <StatusBadge
              label={isFullyPaid ? 'FULLY PAID' : 'PARTIALLY PAID'}
              variant={isFullyPaid ? 'success' : 'warning'}
            />
            {!isFullyPaid ? (
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
