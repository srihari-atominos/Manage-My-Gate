import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/common/ProgressBar';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Layers, Calendar, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';

interface CycleInvoiceItem {
  _id: string;
  invoiceNumber: string;
  unitNumber?: string;
  targetUser?: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  offlineReference?: string;
}

export interface CycleGroupData {
  _id: { period: string; assessmentId: string };
  billingPeriodString: string;
  assessmentName: string;
  totalTargeted: number;
  grossDemand: number;
  totalCollected: number;
  totalOutstanding: number;
  paidCount: number;
  pendingCount: number;
  unpaidCount: number;
  invoices: CycleInvoiceItem[];
}

interface CycleLedgerGroupCardProps {
  cycleGroup: CycleGroupData;
  onSelectInvoice: (invoice: any) => void;
}

export const CycleLedgerGroupCard: React.FC<CycleLedgerGroupCardProps> = ({
  cycleGroup,
  onSelectInvoice,
}) => {
  const [expanded, setExpanded] = useState(false);

  const grossDemand = Number(
    cycleGroup?.grossDemand ??
      (cycleGroup as any)?.totalBilled ??
      (cycleGroup as any)?.totalAmount ??
      0
  );
  const totalCollected = Number(
    cycleGroup?.totalCollected ??
      (cycleGroup as any)?.totalPaid ??
      (cycleGroup as any)?.paidAmount ??
      0
  );
  const totalOutstanding = Number(
    cycleGroup?.totalOutstanding ??
      (cycleGroup as any)?.outstandingBalance ??
      (cycleGroup as any)?.outstandingAmount ??
      0
  );
  const totalTargeted = Number(
    cycleGroup?.totalTargeted ??
      cycleGroup?.invoices?.length ??
      1
  );
  const paidCount = Number(cycleGroup?.paidCount ?? 0);
  const pendingCount = Number(cycleGroup?.pendingCount ?? 0);
  const unpaidCount = Number(cycleGroup?.unpaidCount ?? 0);

  const collectionPercent =
    grossDemand > 0
      ? Math.round((totalCollected / grossDemand) * 100)
      : 0;

  const isFullyCleared = totalOutstanding === 0 && pendingCount === 0;
  const statusVariant: StatusVariant = isFullyCleared
    ? 'success'
    : pendingCount > 0
    ? 'warning'
    : 'danger';

  const assessmentName = cycleGroup?.assessmentName || (cycleGroup as any)?.assessmentTitle || 'Assessment Cycle';
  const billingPeriodString = cycleGroup?.billingPeriodString || (cycleGroup as any)?.billingPeriod || 'Current Period';
  const invoicesList: CycleInvoiceItem[] = Array.isArray(cycleGroup?.invoices)
    ? cycleGroup.invoices
    : (cycleGroup as any)?.invoiceNumber
    ? [cycleGroup as any]
    : [];

  return (
    <View className="bg-card border border-border/80 rounded-2xl p-4 mb-3 shadow-xs">
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 me-3">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Icon as={Layers} size={16} className="text-primary" />
            <Text className="text-base font-bold text-foreground">
              {assessmentName}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon as={Calendar} size={11} className="text-muted-foreground" />
            <Text className="text-xs font-semibold text-muted-foreground">
              Period: {billingPeriodString} • {totalTargeted} Units
            </Text>
          </View>
        </View>

        <StatusBadge
          label={`${collectionPercent}% Collected`}
          variant={statusVariant}
          size="sm"
        />
      </View>

      {/* Canonical Reusable Progress Bar */}
      <View className="mt-3">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-semibold text-foreground">
            ₹{totalCollected.toLocaleString('en-IN')}{' '}
            <Text className="text-muted-foreground">/ ₹{grossDemand.toLocaleString('en-IN')}</Text>
          </Text>
          <Text className="text-xs font-bold text-primary">{collectionPercent}%</Text>
        </View>
        <ProgressBar progress={collectionPercent} className="h-2 rounded-full" />
      </View>

      {/* Status Breakdown Pills */}
      <View className="flex-row items-center gap-2 mt-3">
        <View className="flex-1 bg-status-success/10 border border-status-success/20 py-1.5 px-2 rounded-xl items-center">
          <Text className="text-[10px] uppercase font-bold text-status-success">Paid</Text>
          <Text className="text-xs font-extrabold text-status-success mt-0.5">{paidCount}</Text>
        </View>

        <View className="flex-1 bg-amber-500/10 border border-amber-500/20 py-1.5 px-2 rounded-xl items-center">
          <Text className="text-[10px] uppercase font-bold text-amber-500">Pending</Text>
          <Text className="text-xs font-extrabold text-amber-500 mt-0.5">{pendingCount}</Text>
        </View>

        <View className="flex-1 bg-destructive/10 border border-destructive/20 py-1.5 px-2 rounded-xl items-center">
          <Text className="text-[10px] uppercase font-bold text-destructive">Unpaid</Text>
          <Text className="text-xs font-extrabold text-destructive mt-0.5">{unpaidCount}</Text>
        </View>
      </View>

      {/* Accordion Trigger */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between pt-3 mt-1 border-t border-border/40"
      >
        <Text className="text-xs font-bold text-primary">
          {expanded ? 'Hide Unit Roster' : `View Unit Invoices (${invoicesList.length})`}
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
                    assessmentName,
                    billingPeriodString,
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
                      Unit {inv?.unitNumber || '—'} • {inv?.targetUser || 'Resident'}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted-foreground mt-0.5">
                    Invoice #{inv?.invoiceNumber || '—'}
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

export default CycleLedgerGroupCard;
