import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { QRCodeView } from '@/components/ui/QRCodeView';
import { Building2, Receipt, ShieldCheck } from 'lucide-react-native';

export interface InvoiceQRModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: {
    _id?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    unitNumber?: string;
    billingPeriodString?: string;
    assessmentName?: string;
    totalDue?: number;
    totalAmount?: number;
    outstandingAmount?: number;
    paidAmount?: number;
    status?: string;
  } | null;
}

export const InvoiceQRModal: React.FC<InvoiceQRModalProps> = ({
  visible,
  onClose,
  invoice,
}) => {
  if (!invoice) return null;

  const invNo = invoice.invoiceNumber || invoice.invoiceId || invoice._id || 'INV-UNKNOWN';
  const unitStr = invoice.unitNumber ? `Villa ${invoice.unitNumber}` : 'Community Unit';
  const periodStr = invoice.billingPeriodString || 'Current Period';
  
  const totalAmount = Number(
    invoice.outstandingAmount ??
    invoice.totalDue ??
    invoice.totalAmount ??
    0
  );
  
  const statusStr = invoice.status || 'UNPAID';
  const isPaid = statusStr === 'PAID';
  const statusVariant: StatusVariant = isPaid
    ? 'success'
    : statusStr === 'VERIFICATION_PENDING'
    ? 'warning'
    : 'danger';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Invoice QR Pass">
      <View className="items-center py-2 gap-4">
        {/* Unit & Invoice Metadata Banner */}
        <View className="w-full bg-muted/40 border border-border/70 rounded-2xl p-3.5">
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center gap-1.5">
              <Building2 size={16} className="text-primary" />
              <Text className="text-sm font-bold text-foreground">{unitStr}</Text>
            </View>
            <StatusBadge label={statusStr.replace(/_/g, ' ')} variant={statusVariant} size="sm" />
          </View>

          <View className="flex-row items-center justify-between pt-2 border-t border-border/40">
            <View>
              <Text className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Invoice Number
              </Text>
              <Text className="text-xs font-bold text-foreground font-mono mt-0.5">
                #{invNo}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Amount Due
              </Text>
              <Text className="text-base font-extrabold text-foreground mt-0.5">
                ₹{totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Vector SVG QR Code Container */}
        <QRCodeView
          value={invNo}
          size={190}
          caption={`Scan to verify #${invNo}`}
        />

        {/* Front-Desk Settlement Instruction */}
        <View className="flex-row items-start gap-2 bg-primary/10 border border-primary/20 rounded-xl p-3 w-full">
          <ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-primary">Front-Desk Fast Checkout</Text>
            <Text className="text-[11px] text-muted-foreground mt-0.5 leading-4">
              Present this QR code to the society manager or counter staff to settle cash/cheque dues without typing.
            </Text>
          </View>
        </View>

        {/* Dismiss Button */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onPress={onClose}
          accessibilityLabel="Close QR Pass"
        >
          <Text className="font-bold text-sm text-foreground">Done</Text>
        </Button>
      </View>
    </BottomSheet>
  );
};

export default InvoiceQRModal;
