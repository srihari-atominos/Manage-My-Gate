import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Building2, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';

interface UnitInvoiceItem {
  _id: string;
  invoiceNumber: string;
  billingPeriodString?: string;
  assessmentName?: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  dueDate?: string;
  createdAt?: string;
  paymentMethod?: string;
  offlineReference?: string;
}

export interface UnitGroupData {
  _id: string;
  unitId?: string;
  unitNumber: string;
  blockOrBuilding?: string;
  unitType?: string;
  primaryResident?: string;
  primaryResidentPhone?: string;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  invoiceCount: number;
  pendingCount?: number;
  overdueCount?: number;
  invoices: UnitInvoiceItem[];
}

interface UnitLedgerGroupCardProps {
  unitGroup: UnitGroupData;
  onSelectInvoice: (invoice: any) => void;
}

export const UnitLedgerGroupCard: React.FC<UnitLedgerGroupCardProps> = ({
  unitGroup,
  onSelectInvoice,
}) => {
  const [expanded, setExpanded] = useState(false);

  const outstanding = Number(
    unitGroup?.outstandingBalance ??
      (unitGroup as any)?.outstandingAmount ??
      (unitGroup as any)?.totalDue ??
      0
  );
  const totalBilled = Number(
    unitGroup?.totalBilled ??
      (unitGroup as any)?.totalAmount ??
      (unitGroup as any)?.totalDue ??
      0
  );
  const totalPaid = Number(
    unitGroup?.totalPaid ??
      (unitGroup as any)?.paidAmount ??
      0
  );
  const invoiceCount = Number(
    unitGroup?.invoiceCount ??
      unitGroup?.invoices?.length ??
      1
  );

  const isClear = outstanding === 0;
  const statusVariant: StatusVariant = isClear ? 'success' : 'danger';
  const statusLabel = isClear ? 'All Clear' : `₹${outstanding.toLocaleString('en-IN')} Due`;

  const unitNum = unitGroup?.unitNumber || (unitGroup as any)?.unitInfo?.unitNumber || '—';
  const blockText = unitGroup?.blockOrBuilding && unitGroup.blockOrBuilding !== '—' ? `Block ${unitGroup.blockOrBuilding} • ` : '';
  const typeText = unitGroup?.unitType || 'Villa';

  const invoicesList: UnitInvoiceItem[] = Array.isArray(unitGroup?.invoices)
    ? unitGroup.invoices
    : (unitGroup as any)?.invoiceNumber
    ? [unitGroup as any]
    : [];

  return (
    <View className="bg-card border border-border/80 rounded-2xl p-4 mb-3 shadow-xs">
      {/* Card Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 me-3">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Icon as={Building2} size={16} className="text-primary" />
            <Text className="text-base font-bold text-foreground">
              Unit {unitNum}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            {blockText}{typeText} • {unitGroup?.primaryResident || (unitGroup as any)?.targetUser || 'Resident'}
          </Text>
        </View>

        <StatusBadge label={statusLabel} variant={statusVariant} size="sm" />
      </View>

      {/* Financial Metrics Strip */}
      <View className="flex-row items-center justify-between bg-muted/40 rounded-xl p-3 mt-3 border border-border/50">
        <View className="items-center flex-1">
          <Text className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Invoices</Text>
          <Text className="text-sm font-bold text-foreground mt-0.5">{invoiceCount}</Text>
        </View>
        <View className="h-6 w-px bg-border/60" />
        <View className="items-center flex-1">
          <Text className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Billed</Text>
          <Text className="text-sm font-bold text-foreground mt-0.5">₹{totalBilled.toLocaleString('en-IN')}</Text>
        </View>
        <View className="h-6 w-px bg-border/60" />
        <View className="items-center flex-1">
          <Text className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Paid</Text>
          <Text className="text-sm font-bold text-status-success mt-0.5">₹{totalPaid.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Accordion Trigger */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between pt-3 mt-1 border-t border-border/40"
      >
        <Text className="text-xs font-bold text-primary">
          {expanded ? 'Hide Invoices' : `View Invoices (${invoicesList.length})`}
        </Text>
        <Icon as={expanded ? ChevronUp : ChevronDown} size={16} className="text-primary" />
      </Pressable>

      {/* Expandable Invoice History Roster */}
      {expanded && (
        <View className="mt-3 pt-2 border-t border-border/40 gap-2">
          {invoicesList.map((inv) => {
            const isPaid = inv?.status === 'PAID';
            const isPending = inv?.status === 'VERIFICATION_PENDING';
            const itemVariant: StatusVariant = isPaid ? 'success' : isPending ? 'warning' : 'danger';
            const invAmount = Number(inv?.totalAmount ?? (inv as any)?.totalDue ?? (inv as any)?.amount ?? 0);

            return (
              <Pressable
                key={inv?._id || inv?.invoiceNumber}
                onPress={() =>
                  onSelectInvoice({
                    ...inv,
                    unitNumber: unitNum,
                    targetUser: unitGroup?.primaryResident,
                  })
                }
                className="flex-row items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 active:bg-muted/70"
              >
                <View className="flex-1 me-2">
                  <View className="flex-row items-center gap-1.5">
                    <Icon
                      as={isPaid ? CheckCircle2 : isPending ? Clock : AlertCircle}
                      size={13}
                      className={isPaid ? 'text-status-success' : isPending ? 'text-amber-500' : 'text-destructive'}
                    />
                    <Text className="text-xs font-bold text-foreground">
                      #{inv?.invoiceNumber || '—'}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted-foreground mt-0.5">
                    {inv?.assessmentName || 'Assessment'} {inv?.billingPeriodString ? `• ${inv.billingPeriodString}` : ''}
                    {inv?.offlineReference ? ` • Ref: ${inv.offlineReference}` : ''}
                  </Text>
                </View>

                <View className="items-end gap-1">
                  <Text className="text-xs font-bold text-foreground">
                    ₹{invAmount.toLocaleString('en-IN')}
                  </Text>
                  <StatusBadge label={(inv?.status || 'UNPAID').replace(/_/g, ' ')} variant={itemVariant} size="sm" />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default UnitLedgerGroupCard;
