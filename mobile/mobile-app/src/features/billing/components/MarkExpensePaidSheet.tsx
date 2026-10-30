import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DatePicker } from '@/components/common/DatePicker';
import {
  Banknote,
  Landmark,
  Smartphone,
  FileCheck,
  CreditCard,
  Layers,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import expenseService from '../services/expenseService';
import { createOperationId } from '@/src/utils/idempotency';

export type ExpensePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CARD' | 'OTHER';
export type ExpenseFundingSource = 'COMMUNITY_BANK_ACCOUNT' | 'PETTY_CASH' | 'PERSONAL_ACCOUNT' | 'OTHER';

interface PaymentMethodOption {
  key: ExpensePaymentMethod;
  label: string;
  sublabel: string;
  icon: any;
  defaultFunding: ExpenseFundingSource;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    key: 'CASH',
    label: 'Cash',
    sublabel: 'Petty cash / In-hand',
    icon: Banknote,
    defaultFunding: 'PETTY_CASH',
  },
  {
    key: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    sublabel: 'NEFT / RTGS / IMPS',
    icon: Landmark,
    defaultFunding: 'COMMUNITY_BANK_ACCOUNT',
  },
  {
    key: 'UPI',
    label: 'UPI / QR',
    sublabel: 'GPay, PhonePe, Paytm',
    icon: Smartphone,
    defaultFunding: 'COMMUNITY_BANK_ACCOUNT',
  },
  {
    key: 'CHEQUE',
    label: 'Cheque',
    sublabel: 'Bank cheque / DD',
    icon: FileCheck,
    defaultFunding: 'COMMUNITY_BANK_ACCOUNT',
  },
  {
    key: 'CARD',
    label: 'Debit / Credit Card',
    sublabel: 'POS or online swipe',
    icon: CreditCard,
    defaultFunding: 'COMMUNITY_BANK_ACCOUNT',
  },
  {
    key: 'OTHER',
    label: 'Other',
    sublabel: 'Miscellaneous payment',
    icon: Layers,
    defaultFunding: 'COMMUNITY_BANK_ACCOUNT',
  },
];

const FUNDING_SOURCES: Array<{ key: ExpenseFundingSource; label: string; desc: string }> = [
  { key: 'COMMUNITY_BANK_ACCOUNT', label: 'Community Bank', desc: 'Association account' },
  { key: 'PETTY_CASH', label: 'Petty Cash', desc: 'Admin cash drawer' },
  { key: 'PERSONAL_ACCOUNT', label: 'Personal (Reimbursable)', desc: 'Paid by member' },
];

const formatINR = (value: number | string | null | undefined) =>
  String.fromCharCode(0x20b9) +
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface MarkExpensePaidSheetProps {
  visible: boolean;
  onClose: () => void;
  expense: any;
  onSuccess: () => void;
}

export const MarkExpensePaidSheet: React.FC<MarkExpensePaidSheetProps> = ({
  visible,
  onClose,
  expense,
  onSuccess,
}) => {
  const outstanding = Number(expense?.outstandingAmount || 0);
  const total = Number(expense?.totalAmount || 0);

  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<ExpensePaymentMethod>('CASH');
  const [funding, setFunding] = useState<ExpenseFundingSource>('PETTY_CASH');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [reference, setReference] = useState<string>('');
  const [autoReconcile, setAutoReconcile] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Initialize values whenever sheet opens or expense changes
  useEffect(() => {
    if (visible && expense) {
      setAmount(String(outstanding > 0 ? outstanding : total));
      setMethod('CASH');
      setFunding('PETTY_CASH');
      setPaymentDate(new Date());
      setReference('');
      setAutoReconcile(true);
      setError('');
    }
  }, [visible, expense, outstanding, total]);

  if (!expense) return null;

  const handleMethodSelect = (opt: PaymentMethodOption) => {
    setMethod(opt.key);
    setFunding(opt.defaultFunding);
  };

  const handlePayInFull = () => {
    setAmount(String(outstanding > 0 ? outstanding : total));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      const numericAmount = Number(amount);
      if (!numericAmount || numericAmount <= 0) {
        setError('Please enter a valid payment amount greater than zero.');
        return;
      }
      if (numericAmount > outstanding) {
        setError(`Amount cannot exceed the remaining balance of ${formatINR(outstanding)}.`);
        return;
      }

      setSubmitting(true);
      await expenseService.recordPayment(String(expense._id), {
        idempotencyKey: createOperationId(),
        amount: numericAmount,
        paymentMethod: method,
        paymentApplication: method === 'UPI' ? 'NOT_SPECIFIED' : 'NOT_SPECIFIED',
        fundingSource: funding,
        paymentDate: paymentDate.toISOString(),
        transactionReference: reference.trim() || undefined,
        autoReconcile,
        reconciliationNote: autoReconcile ? 'Directly marked as paid by community admin' : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record payment.';
      setError(msg);
      Alert.alert('Cannot Mark as Paid', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Mark Expense as Paid">
      <View className="gap-5 pt-2 pb-8">
        {/* Expense Overview Card */}
        <View className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <View className="flex-row items-center justify-between gap-2 mb-2">
            <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
              <StatusBadge
                label={expense.settlementStatus === 'PAID' ? 'Paid' : 'Unpaid Liability'}
                variant={expense.settlementStatus === 'PAID' ? 'success' : 'danger'}
                size="sm"
                dot
              />
              {expense.category ? (
                <View className="rounded-md bg-muted px-2 py-0.5">
                  <Text className="text-[11px] font-medium text-muted-foreground" numberOfLines={1}>
                    {expense.category}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xs font-mono text-muted-foreground">
              {expense.expenseNumber}
            </Text>
          </View>

          <Text className="text-base font-bold text-foreground mb-1" numberOfLines={2}>
            {expense.name}
          </Text>
          {expense.vendor?.name ? (
            <Text className="text-xs text-muted-foreground mb-2">
              Vendor: <Text className="font-semibold text-foreground">{expense.vendor.name}</Text>
            </Text>
          ) : null}

          <View className="flex-row items-center justify-between border-t border-border/60 pt-2.5 mt-1">
            <View>
              <Text className="text-[11px] text-muted-foreground">Total Incurred</Text>
              <Text className="text-sm font-semibold text-foreground">{formatINR(total)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[11px] text-muted-foreground">Remaining Balance</Text>
              <Text className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                {formatINR(outstanding)}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Payment Amount */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
              1. Payment Amount (INR)
            </Text>
            {outstanding > 0 && Number(amount) !== outstanding ? (
              <Pressable
                onPress={handlePayInFull}
                accessibilityRole="button"
                accessibilityLabel="Set amount to full balance"
                className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 active:opacity-75"
              >
                <Text className="text-[11px] font-bold text-primary">Pay Full ({formatINR(outstanding)})</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            placeholder={`Enter amount (max ${formatINR(outstanding)})`}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* 2. Payment Method */}
        <View className="gap-2.5">
          <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
            2. Payment Method
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PAYMENT_METHODS.map((opt) => {
              const isSelected = method === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => handleMethodSelect(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${opt.label}`}
                  className={`flex-1 min-w-[45%] flex-row items-center gap-2.5 p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border/80 bg-card active:bg-muted/40'
                  }`}
                >
                  <View
                    className={`size-9 rounded-xl items-center justify-center ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      as={opt.icon}
                      size={18}
                      className={isSelected ? 'text-white' : 'text-foreground'}
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      className={`text-xs ${
                        isSelected ? 'font-bold text-primary' : 'font-semibold text-foreground'
                      }`}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                      {opt.sublabel}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. Funding Source */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
            3. Paid From (Funding Source)
          </Text>
          <View className="flex-row gap-2">
            {FUNDING_SOURCES.map((f) => {
              const isSelected = funding === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFunding(f.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Funded from ${f.label}`}
                  className={`flex-1 p-2.5 rounded-xl border items-center text-center ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border/80 bg-card active:bg-muted/40'
                  }`}
                >
                  <Text
                    className={`text-[11px] text-center ${
                      isSelected ? 'font-bold text-primary' : 'font-semibold text-foreground'
                    }`}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {f.label}
                  </Text>
                  <Text className="text-[9px] text-muted-foreground text-center" numberOfLines={1}>
                    {f.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 4. Payment Date & Optional Reference */}
        <View className="gap-3">
          <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
            4. Date & Transaction Reference
          </Text>
          <View className="gap-2">
            <DatePicker
              label="Payment Date"
              value={paymentDate}
              onChange={setPaymentDate}
            />
            <TextInput
              placeholder="e.g. UTR, Cheque No, or Cash Receipt # (Optional)"
              value={reference}
              onChangeText={setReference}
            />
          </View>
        </View>

        {/* 5. Direct Ledger Reconciliation Toggle */}
        <Pressable
          onPress={() => setAutoReconcile(!autoReconcile)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: autoReconcile }}
          accessibilityLabel="Post confirmed disbursement to ledger immediately"
          className={`flex-row items-start gap-3 p-3.5 rounded-2xl border transition-all ${
            autoReconcile
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-border/80 bg-card active:bg-muted/30'
          }`}
        >
          <View
            className={`size-5 rounded-md items-center justify-center mt-0.5 ${
              autoReconcile
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : 'border border-border bg-muted/30'
            }`}
          >
            {autoReconcile ? <Icon as={Check} size={14} className="text-white" /> : null}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-bold text-foreground">
                Immediate Ledger Reconciliation
              </Text>
              <StatusBadge label="Recommended" variant="success" size="sm" />
            </View>
            <Text className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              Posts cash disbursement to general ledger and updates Community Finance net cash balance instantly.
            </Text>
          </View>
        </Pressable>

        {/* Error message banner */}
        {error ? (
          <View className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <Text className="text-xs font-medium text-destructive">{error}</Text>
          </View>
        ) : null}

        {/* Submit and Cancel Buttons */}
        <View className="gap-2 pt-2">
          <Button
            onPress={handleSubmit}
            disabled={submitting}
            leftIcon={CheckCircle2}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm"
          >
            <Text className="text-white font-bold text-sm">
              {submitting ? 'Marking as Paid…' : 'Confirm & Mark as Paid'}
            </Text>
          </Button>

          <Button
            variant="outline"
            onPress={onClose}
            disabled={submitting}
            className="w-full"
          >
            <Text className="font-semibold text-foreground text-sm">Cancel</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default MarkExpensePaidSheet;
