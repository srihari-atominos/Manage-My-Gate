import React, { useState } from 'react';
import { View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { User, Phone, Mail, ChevronDown, ChevronUp, Bell, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import billingService from '../../services/billingService';

interface ResidentInvoiceItem {
  _id: string;
  invoiceNumber: string;
  unitNumber?: string;
  billingPeriodString?: string;
  assessmentName?: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  dueDate?: string;
  createdAt?: string;
}

export interface ResidentGroupData {
  _id: string;
  residentId?: string;
  residentName: string;
  phone?: string;
  email?: string;
  units: string[];
  totalPortfolioDue: number;
  totalPaid: number;
  totalBilled: number;
  invoiceCount: number;
  pendingCount?: number;
  overdueCount?: number;
  invoices: ResidentInvoiceItem[];
}

interface ResidentLedgerGroupCardProps {
  residentGroup: ResidentGroupData;
  onSelectInvoice: (invoice: any) => void;
}

export const ResidentLedgerGroupCard: React.FC<ResidentLedgerGroupCardProps> = ({
  residentGroup,
  onSelectInvoice,
}) => {
  const [expanded, setExpanded] = useState(false);

  const totalPortfolioDue = Number(
    residentGroup?.totalPortfolioDue ??
      (residentGroup as any)?.outstandingBalance ??
      (residentGroup as any)?.outstandingAmount ??
      (residentGroup as any)?.totalDue ??
      0
  );
  const totalBilled = Number(
    residentGroup?.totalBilled ??
      (residentGroup as any)?.totalAmount ??
      (residentGroup as any)?.totalDue ??
      0
  );
  const totalPaid = Number(
    residentGroup?.totalPaid ??
      (residentGroup as any)?.paidAmount ??
      0
  );
  const invoiceCount = Number(
    residentGroup?.invoiceCount ??
      residentGroup?.invoices?.length ??
      1
  );

  const hasDues = totalPortfolioDue > 0;
  const statusVariant: StatusVariant = hasDues ? 'danger' : 'success';
  const statusLabel = hasDues
    ? `₹${totalPortfolioDue.toLocaleString('en-IN')} Due`
    : 'All Clear';

  const residentName = residentGroup?.residentName || (residentGroup as any)?.targetUser || 'Resident';
  const phone = residentGroup?.phone || (residentGroup as any)?.primaryResidentPhone || '';
  const email = residentGroup?.email || '';
  const units: string[] = Array.isArray(residentGroup?.units)
    ? residentGroup.units
    : (residentGroup as any)?.unitNumber
    ? [(residentGroup as any).unitNumber]
    : [];

  const invoicesList: ResidentInvoiceItem[] = Array.isArray(residentGroup?.invoices)
    ? residentGroup.invoices
    : (residentGroup as any)?.invoiceNumber
    ? [residentGroup as any]
    : [];

  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const residentUserId = residentGroup?.residentId || (residentGroup?._id && residentGroup._id !== 'unassigned' ? residentGroup._id : undefined);

  const handleSendInAppReminder = async () => {
    if (!residentUserId || isSendingReminder) return;
    setIsSendingReminder(true);
    try {
      await billingService.notifyResidentPortfolio({
        residentUserId,
        residentName,
        totalDue: totalPortfolioDue,
        units,
      });
      setIsSendingReminder(false);
      Alert.alert(
        'Reminder Sent',
        `In-app notification reminder sent to ${residentName} for outstanding portfolio balance of ₹${totalPortfolioDue.toLocaleString('en-IN')}.`
      );
    } catch (err: any) {
      setIsSendingReminder(false);
      Alert.alert('Reminder Failed', err?.message || err || 'Could not send reminder notification.');
    }
  };

  return (
    <View className="bg-card border border-border/80 rounded-2xl p-4 mb-3 shadow-xs">
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 me-3">
          <View className="flex-row items-center gap-1.5 mb-1">
            <User size={16} className="text-primary" />
            <Text className="text-base font-bold text-foreground">
              {residentName}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mt-0.5">
            {phone && phone !== '—' ? (
              <View className="flex-row items-center gap-1">
                <Phone size={11} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground">{phone}</Text>
              </View>
            ) : null}
            {email && email !== '—' ? (
              <View className="flex-row items-center gap-1">
                <Mail size={11} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>{email}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <StatusBadge label={statusLabel} variant={statusVariant} size="sm" />
      </View>

      {/* Associated Units Tag Strip */}
      {units.length > 0 && (
        <View className="flex-row flex-wrap items-center gap-1.5 mt-2.5">
          <Text className="text-[11px] font-bold text-muted-foreground me-1">Units:</Text>
          {units.map((u) => (
            <View key={u} className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
              <Text className="text-[11px] font-bold text-primary">Unit {u}</Text>
            </View>
          ))}
        </View>
      )}

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

      {/* Action Footer */}
      <View className="flex-row items-center justify-between pt-3 mt-1 border-t border-border/40">
        <Pressable
          onPress={() => setExpanded(!expanded)}
          className="flex-row items-center gap-1"
        >
          <Text className="text-xs font-bold text-primary">
            {expanded ? 'Hide Invoices' : `Invoices (${invoicesList.length})`}
          </Text>
          {expanded ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-primary" />}
        </Pressable>

        {hasDues && residentUserId ? (
          <Pressable
            onPress={handleSendInAppReminder}
            disabled={isSendingReminder}
            className="flex-row items-center bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full active:bg-primary/20"
            accessibilityRole="button"
            accessibilityLabel="Send in-app reminder to resident"
          >
            {isSendingReminder ? (
              <ActivityIndicator size="small" color="#2563eb" className="me-1.5" />
            ) : (
              <Bell size={13} className="text-primary me-1.5" />
            )}
            <Text className="text-xs font-bold text-primary">
              {isSendingReminder ? 'Sending...' : 'In-App Reminder'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Expandable Invoice History Roster */}
      {expanded && (
        <View className="mt-3 pt-2 border-t border-border/40 gap-2">
          {invoicesList.map((inv) => {
            const isPaid = inv?.status === 'PAID';
            const itemVariant: StatusVariant = isPaid ? 'success' : 'danger';
            const invAmount = Number(inv?.totalAmount ?? (inv as any)?.totalDue ?? (inv as any)?.amount ?? 0);

            return (
              <Pressable
                key={inv?._id || inv?.invoiceNumber}
                onPress={() =>
                  onSelectInvoice({
                    ...inv,
                    targetUser: residentName,
                  })
                }
                className="flex-row items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 active:bg-muted/70"
              >
                <View className="flex-1 me-2">
                  <View className="flex-row items-center gap-1.5">
                    {isPaid ? (
                      <CheckCircle2 size={13} className="text-status-success" />
                    ) : (
                      <AlertCircle size={13} className="text-destructive" />
                    )}
                    <Text className="text-xs font-bold text-foreground">
                      Unit {inv?.unitNumber || '—'} • #{inv?.invoiceNumber || '—'}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted-foreground mt-0.5">
                    {inv?.assessmentName || 'Assessment'} {inv?.billingPeriodString ? `• ${inv.billingPeriodString}` : ''}
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

export default ResidentLedgerGroupCard;
